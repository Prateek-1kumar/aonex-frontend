import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function VariantIncompletePane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const ev = task.signalPayload.evidence as {
    expected: number;
    actual: number;
    axes: Record<string, string[]>;
  };
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Variant matrix incomplete
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Expected</p>
          <p className="text-xl font-bold tabular-nums">{ev.expected}</p>
        </div>
        <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Actual</p>
          <p className="text-xl font-bold tabular-nums text-red-400">{ev.actual}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Axes detected</p>
        {Object.entries(ev.axes).map(([axis, values]) => (
          <p key={axis} className="text-xs">
            <span className="text-muted-foreground">{axis}:</span>{" "}
            <span className="text-foreground/80">{values.join(", ")}</span>
          </p>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.editAndApprove(task.id, {
                fieldName: "variants",
                newCanonicalPath: null,
                newNormalizedValue: { acceptedPartial: true },
                reason: "Approved partial variant matrix",
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
          Accept partial matrix
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.rejectTask(task.id, "missing_field");
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
