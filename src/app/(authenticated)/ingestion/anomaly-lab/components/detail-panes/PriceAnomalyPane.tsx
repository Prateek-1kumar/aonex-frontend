import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function PriceAnomalyPane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const ev = task.signalPayload.evidence as { price: number; median: number; sample: number };
  const [busy, setBusy] = useState(false);
  const ratio = ev.price / ev.median;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Price anomaly
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Price</p>
          <p className="text-lg font-bold tabular-nums">{ev.price}</p>
        </div>
        <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Cluster median</p>
          <p className="text-lg font-bold tabular-nums">{ev.median}</p>
        </div>
        <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Ratio</p>
          <p className="text-lg font-bold tabular-nums text-amber-400">{ratio.toFixed(1)}×</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.editAndApprove(task.id, {
                fieldName: "basePrice",
                newCanonicalPath: null,
                newNormalizedValue: ev.price,
                reason: "Verified anomaly is correct",
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
          Confirm price
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.rejectTask(task.id, "wrong_value");
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40"
        >
          Reject price
        </button>
      </div>
    </div>
  );
}
