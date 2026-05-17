import type {
  ReviewCluster,
  ReviewTaskDetail,
  TaskEvidence,
} from "@/app/(authenticated)/ingestion/anomaly-lab/types";

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

export interface ReviewTask {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  taskType: string;
  status: "open" | "in_progress" | "resolved" | "dismissed";
  createdAt: string;
  proposed_diff: {
    id: string;
    confidenceScore: string;
    diffPayload: Record<string, unknown>;
  } | null;
  fields: Array<{
    id: string;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
    confidence: string;
  }>;
  source_artifact: {
    id: string;
    sourceExternalId: string;
    rawData: Record<string, unknown>;
    status: string;
  } | null;
}

export interface CatalogVariant {
  id: string;
  variantId: string;
  productVersionId: string;
  sku: string | null;
  barcode: string | null;
  price: string | null;
  currency: string | null;
  inventoryQuantity: string | null;
  variantAxes: Record<string, string>;
  createdAt: string;
}

export interface CatalogProduct {
  id: string;
  status: string;
  canonicalCategory: string | null;
  updatedAt: string;
  current_version: {
    id: string;
    title: string;
    brand: string | null;
    gtin: string | null;
    modelNumber: string | null;
    basePrice: string | null;
    currency: string | null;
    images: Array<{ url: string; altText?: string }>;
    description: string | null;
    confidenceScore: string;
    merchantExtensionsJson?: Record<string, unknown>;
    createdAt?: string;
  } | null;
  variants: CatalogVariant[];
}

// ─── Phase 6/8/9 — link ingestion pack ────────────────────────────

export interface RecentIngestion {
  artifact_id: string;
  source_external_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "needs_review";
  received_at: string;
  checksum: string;
  /** "static" | "browser" | "unblock" — Phase 6 escalation tier */
  escalated_to: "static" | "browser" | "unblock" | null;
  escalation_reasons: string[];
  cost_credits: number;
  final_url: string;
  fact_count: number;
  extractor_version: string | null;
}

export interface IngestionTraceEvent {
  id: string;
  event_type: string;
  /** Phase 2 spine stage: persist_artifact | extract | map | validate | score | diff | approve */
  stage: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface IngestionTrace {
  artifact: {
    id: string;
    source_external_id: string;
    status: string;
    received_at: string;
    processing_errors: Array<Record<string, unknown>>;
  };
  events: IngestionTraceEvent[];
}

export type ProvenanceRung =
  | "json_ld"
  | "opengraph"
  | "nuxt"
  | "next_data"
  | "initial_state"
  | "shopify_probe"
  | "shopify_products_json"
  | "magento"
  | "woocommerce"
  | "algolia"
  | "rdfa"
  | "breadcrumb_list"
  | "microdata"
  | "dom_heuristic"
  | "vision_llm"
  | "llm_gap_fill"
  | `per_site_parser:${string}`
  | "direct"
  | "computed"
  | "inferred";

export interface ProvenanceField {
  canonical_path: string | null;
  raw_key: string;
  extracted_value: unknown;
  normalized_value: unknown;
  source_pointer: string;
  extraction_method: string;
  rung: ProvenanceRung;
  confidence: number;
  mapping_method: string | null;
  extractor_version: string;
  mapper_version: string;
}

export interface ProductProvenance {
  product_id: string;
  version_id: string | null;
  category_path: string | null;
  category_schema_version: string | null;
  fields: ProvenanceField[];
}

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )aonex_token=([^;]+)`));
  return match ? (match[2] ?? null) : null;
}

export function setToken(token: string): void {
  // No-op. Kept for typescript compatibility, but cookie is handled server-side now.
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }
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
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login?error=session_expired";
    }
  }
  if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  if (!body.data) throw new Error("Malformed response (missing data)");
  return body.data;
}

export const api = {
  login(email: string, password: string) {
    return fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async res => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Login failed");
      return body as { token: string; expiresAt: string };
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
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API}/api/ingestion/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    }).then(async (res) => {
      const body = (await res.json()) as ApiEnvelope<{ ingestionId: string; rowCount: number }>;
      if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      if (!body.data) throw new Error("Malformed response");
      return body.data;
    });
  },
  importLink(url: string, category_hint?: string) {
    return fetch(`/api/ingestions/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, category_hint }),
    }).then(async res => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Import failed");
      return body.data as {
        ingestion_id: string;
        status: string;
        trace_id: string;
        url: string;
      };
    });
  },
  listReviewTasks(status = "open") {
    return request<{ tasks: ReviewTask[] }>(`/api/review/tasks?status=${encodeURIComponent(status)}`);
  },
  resolveReviewTask(id: string, action: "save" | "approve" | "reject" | "dismiss", diff_payload?: Record<string, unknown>, resolution_notes?: string) {
    return request<{ task_id: string; status: string; catalog?: Record<string, unknown> }>(`/api/review/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action, diff_payload, resolution_notes }),
    });
  },
  listReviewClusters(status: "open" | "resolved" = "open"): Promise<ReviewCluster[]> {
    return request<{ clusters: ReviewCluster[] }>(`/api/review/clusters?status=${status}`).then(d => d.clusters ?? []);
  },
  listClusterItems(clusterKey: string): Promise<ReviewTaskDetail[]> {
    return request<{ items: ReviewTaskDetail[] }>(`/api/review/clusters/${encodeURIComponent(clusterKey)}/items`).then(d => d.items ?? []);
  },
  resolveCluster(
    clusterKey: string,
    action: "approve_all" | "reject_all",
    bulkEdit?: { fieldName: string; newValue: unknown }
  ): Promise<{ resolvedCount: number; overridesCreated: number }> {
    return request<{ resolvedCount: number; overridesCreated: number }>(
      `/api/review/clusters/${encodeURIComponent(clusterKey)}/resolve`,
      { method: "POST", body: JSON.stringify({ action, bulkEdit }) }
    );
  },
  editAndApprove(
    taskId: string,
    payload: {
      fieldName: string;
      newCanonicalPath: string | null;
      newNormalizedValue: unknown;
      pickedCandidateSource?: string;
      reason?: string;
    }
  ): Promise<{ overrideId: string | null }> {
    return request<{ overrideId: string | null }>(
      `/api/review/tasks/${encodeURIComponent(taskId)}/edit-and-approve`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },
  rejectTask(
    taskId: string,
    reason: "wrong_value" | "missing_field" | "wrong_category" | "no_product_found",
    note?: string
  ): Promise<{ failureId: string }> {
    return request<{ failureId: string }>(
      `/api/review/tasks/${encodeURIComponent(taskId)}/reject`,
      { method: "POST", body: JSON.stringify({ reason, note }) }
    );
  },
  mergeTask(taskId: string, existingProductId: string): Promise<{ aliasId: string }> {
    return request<{ aliasId: string }>(
      `/api/review/tasks/${encodeURIComponent(taskId)}/merge`,
      { method: "POST", body: JSON.stringify({ existingProductId }) }
    );
  },
  getTaskEvidence(taskId: string): Promise<TaskEvidence> {
    return request<TaskEvidence>(`/api/review/tasks/${encodeURIComponent(taskId)}/evidence`);
  },
  deleteCatalogProduct(id: string): Promise<{ id: string; status: string }> {
    return request<{ id: string; status: string }>(
      `/api/catalog/products/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  },
  listCatalogProducts() {
    return request<{ products: CatalogProduct[] }>("/api/catalog/products");
  },
  listRecentIngestions(limit = 20): Promise<{ ingestions: RecentIngestion[] }> {
    return request<{ ingestions: RecentIngestion[] }>(`/api/ingestions/recent?limit=${limit}`);
  },
  getIngestionTrace(artifactId: string): Promise<IngestionTrace> {
    return request<IngestionTrace>(`/api/ingestions/${encodeURIComponent(artifactId)}/trace`);
  },
  getProductProvenance(productId: string): Promise<ProductProvenance> {
    return request<ProductProvenance>(`/api/catalog/products/${encodeURIComponent(productId)}/provenance`);
  },
};
