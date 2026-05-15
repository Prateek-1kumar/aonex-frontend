import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function PotentialDuplicatePane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const conflicts = (task.signalPayload.evidence as Record<string, unknown>).conflicts as
    | { type: string; existing: { productId: string; brand: string | null; canonicalCategory: string | null } }[]
    | undefined;
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Potential duplicate
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>

      <div className="space-y-3 mb-6">
        {(conflicts ?? []).map((c, i) => (
          <div key={i} className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-3">
            <p className="text-xs text-muted-foreground mb-2">{c.type} match</p>
            <p className="text-sm text-foreground/90">Existing brand: {c.existing.brand ?? "(unknown)"}</p>
            <p className="text-sm text-foreground/90">Existing category: {c.existing.canonicalCategory ?? "(unknown)"}</p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.mergeTask(task.id, c.existing.productId);
                  onResolved();
                } catch (e) {
                  onError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-2 px-3 py-1.5 rounded-md bg-amber-500/15 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 disabled:opacity-40"
            >
              Merge with this product
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.rejectTask(task.id, "wrong_value", "Keep separate");
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 text-xs font-semibold hover:bg-white/[0.07] disabled:opacity-40"
        >
          Keep separate (not a duplicate)
        </button>
      </div>
    </div>
  );
}
