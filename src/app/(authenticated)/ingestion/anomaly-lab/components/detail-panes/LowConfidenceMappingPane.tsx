import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewTaskDetail } from "../../types";

export function LowConfidenceMappingPane({
  task,
  onResolved,
  onError,
}: {
  task: ReviewTaskDetail;
  onResolved: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [newPath, setNewPath] = useState<string>(task.fieldName ?? "");
  const [newValue, setNewValue] = useState<string>("");
  const candidates = (task.signalPayload.candidates ?? []) as { value: unknown; source: string; confidence: number }[];

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
        Low-confidence mapping for <span className="text-foreground/80">{task.fieldName}</span>
      </p>
      <p className="text-xs text-muted-foreground mb-4">{task.signalPayload.reasonText}</p>

      <label className="block text-xs text-muted-foreground mb-1">Canonical field</label>
      <select
        value={newPath}
        onChange={(e) => setNewPath(e.target.value)}
        className="w-full bg-white/[0.04] border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground/90 mb-4"
      >
        <option value={task.fieldName ?? ""}>{task.fieldName} (current)</option>
        {candidates.map((c, i) => (
          <option key={i} value={String(c.value)}>
            {String(c.value)} ({(c.confidence * 100).toFixed(0)}%)
          </option>
        ))}
      </select>

      <label className="block text-xs text-muted-foreground mb-1">Normalized value</label>
      <input
        type="text"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder="Leave empty to keep current"
        className="w-full bg-white/[0.04] border border-border/[0.08] rounded-lg px-3 py-2 text-sm text-foreground/90 mb-4"
      />

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              // Only send newNormalizedValue when the reviewer actually typed
              // something. Sending undefined here used to silently blank the
              // existing field (e.g. title) during serialization on the server.
              const trimmed = newValue.trim();
              const payload: Parameters<typeof api.editAndApprove>[1] = {
                fieldName: task.fieldName!,
                newCanonicalPath: newPath || null,
                newNormalizedValue: trimmed ? trimmed : null,
              };
              await api.editAndApprove(task.id, payload);
              onResolved();
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold hover:bg-primary/20 disabled:opacity-40"
        >
          Edit & approve
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
          Reject
        </button>
      </div>
    </div>
  );
}
