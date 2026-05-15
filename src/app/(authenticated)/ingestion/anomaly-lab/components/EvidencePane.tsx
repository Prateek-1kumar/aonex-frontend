import type { TaskEvidence } from "../types";
import { HtmlSnippetIframe } from "./evidence/HtmlSnippetIframe";

export function EvidencePane({ evidence }: { evidence: TaskEvidence | null }) {
  return (
    <div className="rounded-xl border border-border/[0.08] bg-card p-5 h-full overflow-y-auto">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Evidence
      </p>
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
