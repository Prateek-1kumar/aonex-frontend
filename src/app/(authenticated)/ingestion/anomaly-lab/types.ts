export type SignalKind =
  | "low_confidence_mapping"
  | "missing_required_attribute"
  | "field_conflict"
  | "unit_conflict"
  | "potential_duplicate"
  | "category_ambiguous"
  | "variant_incomplete"
  | "price_anomaly"
  | "fetch_failed"
  | "captcha_wall"
  | "no_data_extracted"
  | "artifact_duplicate";

export type Severity = "low" | "medium" | "high" | "critical";

export interface ReviewCluster {
  clusterKey: string;
  signalKind: SignalKind;
  severity: Severity;
  itemCount: number;
  lastUpdated: string;
}

export interface ReviewTaskDetail {
  id: string;
  signalKind: SignalKind;
  severity: Severity;
  fieldName: string | null;
  clusterKey: string;
  signalPayload: {
    evidence: Record<string, unknown>;
    reasonText: string;
    affectedFields: string[];
    candidates?: { value: unknown; source: string; confidence: number }[];
  };
  proposedDiff: { diffPayload: Record<string, unknown> } | null;
  createdAt: string;
}

export interface TaskEvidence {
  sourceUrl: string;
  htmlSnippet: string | null;
  signalPayload: ReviewTaskDetail["signalPayload"];
  fieldName: string | null;
  signalKind: SignalKind;
}
