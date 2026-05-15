import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

const COMMON_UNITS = ["in", "cm", "mm", "kg", "g", "L", "ml", "mAh", "Wh", "W", "V", "Hz"];

export function UnitConflictPane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const [unit, setUnit] = useState<string>(COMMON_UNITS[0]!);
  const [busy, setBusy] = useState(false);

  const fields = (task.signalPayload.evidence as Record<string, unknown>).fields as
    | { key: string; value: unknown }[]
    | undefined;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Unit ambiguity
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>

      <div className="space-y-2 mb-6">
        {(fields ?? []).map((f) => (
          <div key={f.key} className="flex items-center justify-between rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
            <span className="text-sm font-mono text-foreground/80">{f.key}</span>
            <span className="text-sm font-bold tabular-nums">{String(f.value)}</span>
          </div>
        ))}
      </div>

      <label className="block text-xs text-muted-foreground mb-1">Apply unit</label>
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="w-full bg-white/[0.04] border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground/90 mb-6"
      >
        {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.editAndApprove(task.id, {
                fieldName: task.fieldName!,
                newCanonicalPath: null,
                newNormalizedValue: { unit, fields },
                reason: `Set unit=${unit}`,
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
          Apply unit
        </button>
      </div>
    </div>
  );
}
