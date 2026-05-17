import { useState } from "react";
import { CheckCircle2, X, GitMerge, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

const WEIGHTS = { gtin: 0.40, mpn: 0.20, titleSimilarity: 0.25, brand: 0.15 } as const;
const SIGNAL_LABEL: Record<keyof typeof WEIGHTS, string> = {
  gtin: "GTIN",
  mpn: "MPN",
  titleSimilarity: "Title similarity",
  brand: "Brand"
};

interface ScoreBreakdown {
  gtin: number | null;
  mpn: number | null;
  titleSimilarity: number | null;
  brand: number | null;
  composite: number;
  signalCoverage: number;
}

interface ConflictEvidence {
  reason?: string;
  existingProductId?: string;
  score?: ScoreBreakdown;
  incoming?: { gtin: string | null; brand: string | null; title: string | null };
  existing?: { gtin: string | null; brand: string | null; title: string | null };
}

export function ValueConflictPane({
  task,
  onResolved,
  onError
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const ev = (task.signalPayload.evidence ?? {}) as ConflictEvidence;
  const [busy, setBusy] = useState<"approve" | "reject" | "merge" | null>(null);

  async function action(kind: "approve" | "reject" | "merge") {
    setBusy(kind);
    try {
      if (kind === "approve") {
        await api.resolveReviewTask(task.id, "approve");
      } else if (kind === "reject") {
        await api.resolveReviewTask(task.id, "reject");
      } else {
        if (!ev.existingProductId) {
          throw new Error("Missing existingProductId; cannot merge");
        }
        await api.mergeTask(task.id, ev.existingProductId);
      }
      onResolved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const score = ev.score;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
        Multi-source value conflict
      </p>
      <p className="text-xs text-muted-foreground mb-5">
        An existing product shares the same GTIN but identity signals only partially agree. Review the score breakdown and pick how to reconcile.
      </p>

      {/* Composite score banner */}
      {score && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
              Composite reconciliation score
            </p>
            <p className="text-2xl font-bold tabular-nums text-amber-300">
              {(score.composite * 100).toFixed(0)}<span className="text-xs">%</span>
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            Signal coverage {(score.signalCoverage * 100).toFixed(0)}% · auto-merge threshold ≥ 70% · keep-separate &lt; 40%
          </p>
        </div>
      )}

      {/* Per-signal breakdown bars */}
      {score && (
        <div className="space-y-3 mb-6">
          {(Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>).map((key) => {
            const value = score[key];
            const weight = WEIGHTS[key];
            const matched = value === 1;
            const unknown = value === null;
            const bar = unknown ? 0 : (value as number) * 100;
            const tone =
              unknown
                ? "bg-muted-foreground/30"
                : matched
                  ? "bg-emerald-400"
                  : value !== null && (value as number) >= 0.7
                    ? "bg-amber-400"
                    : "bg-red-400";
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs font-semibold text-foreground/85">
                    {SIGNAL_LABEL[key]}
                    <span className="ml-2 text-[10px] font-normal text-muted-foreground/50">
                      weight {(weight * 100).toFixed(0)}%
                    </span>
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground/70">
                    {unknown ? "not present" : `${((value as number) * 100).toFixed(0)}%`}
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full ${tone} transition-all`}
                    style={{ width: `${Math.max(unknown ? 0 : 2, bar)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-side identity comparison */}
      {(ev.incoming || ev.existing) && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <IdentityCard label="Incoming" identity={ev.incoming ?? {}} />
          <IdentityCard label="Existing" identity={ev.existing ?? {}} tone="muted" />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void action("merge")}
          disabled={busy !== null || !ev.existingProductId}
          className="px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/25 text-xs font-semibold hover:bg-primary/25 disabled:opacity-40 flex items-center gap-1.5"
        >
          {busy === "merge" ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
          Merge into existing
        </button>
        <button
          onClick={() => void action("approve")}
          disabled={busy !== null}
          className="px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-40 flex items-center gap-1.5"
        >
          {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          Keep separate
        </button>
        <button
          onClick={() => void action("reject")}
          disabled={busy !== null}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-muted-foreground hover:text-foreground/80 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
        >
          {busy === "reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Dismiss
        </button>
      </div>
    </div>
  );
}

function IdentityCard({
  label,
  identity,
  tone
}: {
  label: string;
  identity: { gtin?: string | null; brand?: string | null; title?: string | null };
  tone?: "muted";
}) {
  const titleTone = tone === "muted" ? "text-foreground/65" : "text-foreground/90";
  return (
    <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
        {label}
      </p>
      <p className={`text-sm font-semibold leading-tight ${titleTone}`}>
        {identity.title ?? <span className="text-muted-foreground/40 italic">no title</span>}
      </p>
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground/50">Brand</span>
          <span className="text-foreground/75 truncate">
            {identity.brand ?? <span className="text-muted-foreground/40 italic">—</span>}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground/50">GTIN</span>
          <span className="font-mono text-foreground/75 truncate">
            {identity.gtin ?? <span className="text-muted-foreground/40 italic">—</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
