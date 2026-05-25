export interface QueueItem {
  stagedProductId: string;
  denormTitle: string | null;
  denormBrand: string | null;
  denormPrice: string | null;
  denormCurrency: string | null;
  sourceKind: string;
  missingFields: string[];
  candidateCount: number;
  createdAt: string;
}

export interface QueueStats {
  total: number;
  byReason: Record<string, number>;
  bySource: Record<string, number>;
  byAge: { today: number; week: number; older: number };
}

export interface MatchCandidate {
  productId: string;
  score: number;
  kind: "live" | "staged";
  title: string | null;
  brand: string | null;
}

export interface StagedDetail {
  stagedProductId: string;
  sourceKind: string;
  sourceArtifactId: string;
  proposedIdentity: Record<string, unknown>;
  observations: Record<string, unknown>;
  missingFields: string[];
  signals: unknown[];
  matchCandidates: MatchCandidate[];
}

export interface Evidence {
  kind: "html" | "json" | "none";
  content: unknown;
}

export type ApproveResult =
  | { ok: true; productId: string }
  | { ok: false; stillMissing: string[] };
