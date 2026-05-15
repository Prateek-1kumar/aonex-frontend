import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function CategoryAmbiguousPane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const ev = task.signalPayload.evidence as { path: string | null; confidence: number };
  const [picked, setPicked] = useState<string>(ev.path ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Category ambiguous
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Suggested: <span className="text-foreground/80">{ev.path ?? "(none)"}</span>
        {ev.path && <> · confidence {(ev.confidence * 100).toFixed(0)}%</>}
      </p>
      <label className="block text-xs text-muted-foreground mb-1">Pick canonical category</label>
      <input
        type="text"
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        placeholder="e.g. apparel/t_shirts"
        className="w-full bg-white/[0.04] border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground/90 mb-6"
      />
      <div className="flex gap-2">
        <button
          disabled={busy || !picked}
          onClick={async () => {
            setBusy(true);
            try {
              await api.editAndApprove(task.id, {
                fieldName: "canonicalCategory",
                newCanonicalPath: "canonicalCategory",
                newNormalizedValue: picked,
                reason: "Selected category",
              });
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold hover:bg-primary/20 disabled:opacity-40"
        >
          Apply category
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.rejectTask(task.id, "wrong_category");
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40"
        >
          Reject category
        </button>
      </div>
    </div>
  );
}
