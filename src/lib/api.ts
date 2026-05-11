const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  tenantName?: string;
}

export interface SystemHealth {
  status: "nominal" | "degraded" | "offline";
  loadPercent: number;
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

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getLocalProfile(): Partial<UserProfile> {
  const token = getToken();
  if (!token) return {};
  const payload = decodeJwtPayload(token);
  return {
    id: String(payload.sub ?? ""),
    email: String(payload.email ?? ""),
    displayName: String(payload.displayName ?? payload.name ?? payload.email ?? "User"),
    role: String(payload.role ?? "Member"),
    tenantName: String(payload.tenantName ?? ""),
  };
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
      body: JSON.stringify({ email, password }),
    });
  },
  signup(email: string, password: string, displayName: string, tenantName: string) {
    return request<{ token: string; expiresAt: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, tenantName }),
    });
  },
  googleComplete(tenantName: string, pendingToken: string) {
    return request<{ token: string; expiresAt: string }>("/api/auth/google/complete", {
      method: "POST",
      body: JSON.stringify({ tenantName, pendingToken }),
    });
  },
  me() {
    return request<UserProfile>("/api/auth/me");
  },
  systemHealth() {
    return request<SystemHealth>("/api/system/health");
  },
  listConnections() {
    return request<Array<{ marketplace: string; status: string; connectedAt?: string }>>(
      "/api/connections"
    );
  },
  startConnect(marketplace: "shopify" | "amazon" | "ebay") {
    return request<{ token: string; expiresAt: string }>("/api/connections", {
      method: "POST",
      body: JSON.stringify({ marketplaces: [marketplace] }),
    });
  },
  triggerSync(marketplace: string) {
    return request<{ ok: true }>("/api/sync/trigger", {
      method: "POST",
      body: JSON.stringify({ marketplace }),
    });
  },
  revoke(marketplace: string) {
    return request<{ ok: true }>(`/api/connections/${marketplace}`, {
      method: "DELETE",
    });
  },
  uploadCsv(file: File) {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API}/api/ingestion/upload`, {
      method: "POST",
      credentials: "include",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      const body = (await res.json()) as ApiEnvelope<{ ingestionId: string; rowCount: number }>;
      if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      if (!body.data) throw new Error("Malformed response");
      return body.data;
    });
  },
  submitUrl(url: string) {
    return request<{ ingestionId: string }>("/api/ingestion/url", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },
};
