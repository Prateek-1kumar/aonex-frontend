import type { SignalKind, TaskEvidence } from "../types";
import { HtmlSnippetIframe } from "./evidence/HtmlSnippetIframe";

const SIGNAL_CHIP_TONE: Partial<Record<SignalKind, string>> = {
  value_conflict: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  potential_duplicate: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  fetch_failed: "bg-red-500/15 text-red-300 border-red-500/20",
  captcha_wall: "bg-red-500/15 text-red-300 border-red-500/20",
  no_data_extracted: "bg-red-500/15 text-red-300 border-red-500/20",
  artifact_duplicate: "bg-red-500/15 text-red-300 border-red-500/20",
};

const DEFAULT_CHIP_TONE = "bg-primary/15 text-primary border-primary/20";

const SIGNAL_CHIP_LABEL: Partial<Record<SignalKind, string>> = {
  value_conflict: "Value conflict",
  potential_duplicate: "Potential dup",
  field_conflict: "Field conflict",
  unit_conflict: "Unit conflict",
  low_confidence_mapping: "Low confidence",
  missing_required_attribute: "Missing attr",
  category_ambiguous: "Category amb",
  variant_incomplete: "Variant incomplete",
  price_anomaly: "Price anomaly",
  fetch_failed: "Fetch failed",
  captcha_wall: "Captcha wall",
  no_data_extracted: "No data",
  artifact_duplicate: "Duplicate URL",
};

export function EvidencePane({ evidence }: { evidence: TaskEvidence | null }) {
  return (
    <div className="rounded-xl border border-border/[0.08] bg-card p-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Evidence
        </p>
        {evidence && (
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${SIGNAL_CHIP_TONE[evidence.signalKind] ?? DEFAULT_CHIP_TONE}`}
          >
            {SIGNAL_CHIP_LABEL[evidence.signalKind] ?? evidence.signalKind}
          </span>
        )}
      </div>
      {!evidence ? (
        <p className="text-xs text-muted-foreground">Select a task to inspect evidence.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-1">Source URL</p>
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary/80 break-all hover:underline mb-4 block"
          >
            {evidence.sourceUrl}
          </a>

          <p className="text-xs text-muted-foreground mb-1">Field</p>
          <p className="text-sm text-foreground/80 mb-4">{evidence.fieldName ?? "(N/A)"}</p>

          <p className="text-xs text-muted-foreground mb-1">Signal</p>
          <p className="text-sm text-foreground/80 mb-4">{evidence.signalKind}</p>

          <p className="text-xs text-muted-foreground mb-2">HTML snippet (sandboxed)</p>
          <HtmlSnippetIframe html={evidence.htmlSnippet} />

          <p className="text-xs text-muted-foreground mt-4 mb-1">Signal payload (debug)</p>
          <pre className="text-[10px] bg-white/[0.02] rounded p-2 overflow-x-auto leading-tight">
{JSON.stringify(evidence.signalPayload, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
