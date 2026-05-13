"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { api, type ReviewTask } from "@/lib/api";

type Toast = { type: "success" | "error"; message: string } | null;

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-muted-foreground/40",
};

export default function AnomalyLabPage() {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>("load");
  const [toast, setToast] = useState<Toast>(null);

  const selected = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? tasks[0] ?? null,
    [tasks, selectedId]
  );

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    if (!selected?.proposed_diff?.diffPayload) {
      setDraft("");
      return;
    }
    setDraft(JSON.stringify(selected.proposed_diff.diffPayload, null, 2));
  }, [selected?.id]);

  async function loadTasks() {
    setBusy("load");
    try {
      const res = await api.listReviewTasks("open");
      setTasks(res.tasks);
      setSelectedId(res.tasks[0]?.id ?? null);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  async function resolve(action: "approve" | "reject") {
    if (!selected) return;
    setBusy(action);
    try {
      const payload = draft.trim() ? JSON.parse(draft) as Record<string, unknown> : undefined;
      await api.resolveReviewTask(selected.id, action, payload, action === "approve" ? "Approved in Anomaly Lab" : "Rejected in Anomaly Lab");
      const remaining = tasks.filter((task) => task.id !== selected.id);
      setTasks(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      showToast({ type: "success", message: action === "approve" ? "Approved into catalog." : "Rejected." });
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-in h-full">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-bold text-foreground">Anomaly Lab</h1>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Human Verification Queue
            </p>
          </div>
          <button
            onClick={() => void loadTasks()}
            disabled={busy !== null}
            className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center disabled:opacity-40"
          >
            {busy === "load" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
        </div>

        {toast && (
          <div className={[
            "mt-5 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
            toast.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400",
          ].join(" ")}>
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.message}
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mb-4" strokeWidth={1.5} />
          <p className="font-serif text-lg font-semibold text-foreground/80">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">No items need review.</p>
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: "calc(100vh - 250px)" }}>
          <div className="w-80 shrink-0 flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1">
            {tasks.map((task) => {
              const payload = task.proposed_diff?.diffPayload ?? {};
              const title = typeof payload.title === "string" ? payload.title : "Untitled product";
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedId(task.id)}
                  className={[
                    "w-full text-left rounded-xl border p-4 transition-all duration-150",
                    selected?.id === task.id
                      ? "border-primary/25 bg-primary/5"
                      : "border-border/[0.07] bg-card hover:border-border/[0.12] hover:bg-white/[0.02]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-2 rounded-full shrink-0 ${SEVERITY_DOT[task.severity] ?? SEVERITY_DOT.low}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {task.severity}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground/90 line-clamp-2">{title}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{task.taskType}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-2">
                    {new Date(task.createdAt).toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="flex-1 rounded-xl border border-border/[0.08] bg-card p-6 overflow-y-auto scrollbar-thin">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                    Proposed Canonical Payload
                  </p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    className="h-80 w-full resize-none rounded-lg border border-border/[0.08] bg-white/[0.03] p-4 font-mono text-xs leading-5 text-foreground/80 outline-none focus:border-primary/30"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                    Field Evidence
                  </p>
                  <div className="space-y-2">
                    {selected.fields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-border/[0.05] px-3 py-2 gap-4">
                        <span className="text-sm font-mono text-foreground/80 truncate">{field.fieldName}</span>
                        <span className="text-xs font-bold tabular-nums text-muted-foreground">
                          {(Number(field.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void resolve("approve")}
                    disabled={busy !== null}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40"
                  >
                    <Check size={13} /> Approve to Catalog
                  </button>
                  <button
                    onClick={() => void resolve("reject")}
                    disabled={busy !== null}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  >
                    <X size={13} /> Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
