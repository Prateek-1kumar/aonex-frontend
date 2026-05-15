import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function FieldConflictPane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const candidates = task.signalPayload.candidates ?? [];

  async function pick(source: string, value: unknown) {
    setBusy(true);
    try {
      await api.editAndApprove(task.id, {
        fieldName: task.fieldName!,
        newCanonicalPath: null,
        newNormalizedValue: value,
        pickedCandidateSource: source,
        reason: `Picked ${source}`,
      });
      onResolved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Field conflict on <span className="text-foreground/80">{task.fieldName}</span>
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>
      <div className="space-y-2">
        {candidates.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-3 gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">{c.source}</p>
              <p className="text-sm font-medium text-foreground/90 truncate">{String(c.value)}</p>
            </div>
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
              {(c.confidence * 100).toFixed(0)}%
            </span>
            <button
              disabled={busy}
              onClick={() => void pick(c.source, c.value)}
              className="px-3 py-1.5 rounded-md bg-primary/10 text-primary/100 text-xs font-semibold hover:bg-primary/20 disabled:opacity-40"
            >
              Use this
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
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
          Reject
        </button>
      </div>
    </div>
  );
}
