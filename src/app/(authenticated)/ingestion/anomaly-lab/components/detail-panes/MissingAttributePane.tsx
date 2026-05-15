import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function MissingAttributePane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const missing = task.signalPayload.affectedFields ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Missing required attributes
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>

      <div className="space-y-3 mb-6">
        {missing.map((field) => (
          <div key={field}>
            <label className="block text-xs text-muted-foreground mb-1">{field}</label>
            <input
              type="text"
              value={values[field] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              className="w-full bg-white/[0.04] border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground/90"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          disabled={busy || missing.every((f) => !values[f])}
          onClick={async () => {
            setBusy(true);
            try {
              for (const field of missing) {
                if (!values[field]) continue;
                await api.editAndApprove(task.id, {
                  fieldName: field,
                  newCanonicalPath: field,
                  newNormalizedValue: values[field],
                  reason: "Filled missing attribute",
                });
              }
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold hover:bg-primary/20 disabled:opacity-40"
        >
          Apply
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
          Mark not applicable
        </button>
      </div>
    </div>
  );
}
