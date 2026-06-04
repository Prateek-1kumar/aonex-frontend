import type { Evidence } from "../lib/lab-types";

interface LabEvidencePaneProps {
  evidence: Evidence | null;
}

export function LabEvidencePane({ evidence }: LabEvidencePaneProps) {
  return (
    <div className="rounded-xl border border-border/[0.08] bg-card p-5 h-full flex flex-col overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 shrink-0">
        Source Evidence
      </p>

      {evidence === null ? (
        /* Loading shimmer */
        <div className="flex-1 space-y-2 animate-pulse">
          <div className="h-3 rounded bg-surface w-3/4" />
          <div className="h-3 rounded bg-surface w-1/2" />
          <div className="h-40 rounded bg-surface mt-4" />
        </div>
      ) : evidence.kind === "none" ? (
        <p className="text-sm text-muted-foreground/50 mt-4">No source evidence available.</p>
      ) : evidence.kind === "html" ? (
        <iframe
          srcDoc={String(evidence.content)}
          sandbox=""
          className="w-full flex-1 min-h-[400px] border border-border/[0.08] rounded-lg"
          title="Source evidence"
        />
      ) : (
        /* json */
        <pre className="flex-1 overflow-auto text-[10px] leading-relaxed bg-surface rounded-lg p-3 font-mono text-muted-foreground/80 whitespace-pre-wrap break-all">
          {JSON.stringify(evidence.content, null, 2)}
        </pre>
      )}
    </div>
  );
}
