// Minimal client for the Aonex backend at NEXT_PUBLIC_API_URL.
// JWT lives in localStorage for Phase 1; can move to httpOnly cookie
// once backend has a session endpoint that handles set-cookie.

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("aonex.token");
}

export function setToken(token: string): void {
  window.localStorage.setItem("aonex.token", token);
}

export function clearToken(): void {
  window.localStorage.removeItem("aonex.token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  if (!body.data) throw new Error("Malformed response (missing data)");
  return body.data;
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; expiresAt: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  signup(email: string, password: string, displayName: string, tenantName: string) {
    return request<{ token: string; expiresAt: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, tenantName })
    });
  },
  googleComplete(tenantName: string, pendingToken: string) {
    return request<{ token: string; expiresAt: string }>("/api/auth/google/complete", {
      method: "POST",
      body: JSON.stringify({ tenantName, pendingToken })
    });
  },
  listConnections() {
    return request<
      Array<{ marketplace: string; status: string; connectedAt?: string }>
    >("/api/connections");
  },
  startConnect(marketplace: "shopify" | "amazon" | "ebay") {
    return request<{ token: string; expiresAt: string }>("/api/connections", {
      method: "POST",
      body: JSON.stringify({ marketplaces: [marketplace] })
    });
  },
  triggerSync(marketplace: string) {
    return request<{ ok: true }>("/api/sync/trigger", {
      method: "POST",
      body: JSON.stringify({ marketplace })
    });
  },
  revoke(marketplace: string) {
    return request<{ ok: true }>(`/api/connections/${marketplace}`, {
      method: "DELETE"
    });
  }
};
