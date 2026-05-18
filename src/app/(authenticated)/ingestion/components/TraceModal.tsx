"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { api, type IngestionTrace } from "@/lib/api";
import { ExtractedSku } from "./ExtractedSku";

interface Props {
  artifactId: string;
  onClose: () => void;
}

const STAGE_ORDER = [
  { id: "persist_artifact", label: "Persist artifact" },
  { id: "extract",          label: "Extract facts" },
  { id: "map",              label: "Semantic map" },
  { id: "validate",         label: "Validate schema" },
  { id: "score",            label: "Policy score" },
  { id: "diff",             label: "Proposed diff" },
  { id: "approve",          label: "Approve / review" }
] as const;

function formatRel(a: string, b: string): string {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms < 1000) return `+${ms}ms`;
  return `+${(ms / 1000).toFixed(1)}s`;
}

export function TraceModal({ artifactId, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [trace, setTrace] = useState<IngestionTrace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    api.getIngestionTrace(artifactId)
      .then(setTrace)
      .catch((e) => setError((e as Error).message));
  }, [artifactId]);

  if (!mounted) return null;

  const stageEvents: Record<string, IngestionTrace["events"][number] | undefined> = {};
  if (trace) {
    for (const e of trace.events) {
      if (e.stage && !stageEvents[e.stage]) stageEvents[e.stage] = e;
    }
  }

  const firstAt = trace?.events[0]?.created_at;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-border/[0.06] bg-card/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Ingestion Trace
            </p>
            <p className="mt-0.5 text-sm font-mono text-foreground/90 truncate">
              {trace?.artifact.source_external_id ?? artifactId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6">
          {!trace && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground/60" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {trace && <ExtractedSku sku={trace.sku ?? null} />}

          {trace && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="Status" value={trace.artifact.status} />
                <Stat label="Events" value={String(trace.events.length)} />
                <Stat label="Stages reached" value={String(Object.keys(stageEvents).length)} />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                Spine Stage Timeline
              </p>
              <ol className="space-y-2">
                {STAGE_ORDER.map((stage, idx) => {
                  const ev = stageEvents[stage.id];
                  return (
                    <li
                      key={stage.id}
                      className={[
                        "flex items-start gap-3 px-3 py-2.5 rounded-lg border",
                        ev
                          ? "bg-emerald-500/[0.04] border-emerald-500/20"
                          : "bg-white/[0.02] border-border/[0.06]"
                      ].join(" ")}
                    >
                      <div className={[
                        "mt-0.5 size-5 rounded-full flex items-center justify-center shrink-0",
                        ev ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.04] text-muted-foreground/40"
                      ].join(" ")}>
                        {ev ? <CheckCircle2 size={12} /> : <Clock size={10} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground/90">
                            {idx + 1}. {stage.label}
                          </p>
                          {ev && firstAt && (
                            <span className="text-[10px] tabular-nums text-muted-foreground/60">
                              {formatRel(firstAt, ev.created_at)}
                            </span>
                          )}
                        </div>
                        {ev?.metadata && (
                          <details className="mt-1.5">
                            <summary className="text-[10px] text-muted-foreground/50 cursor-pointer hover:text-foreground/70 uppercase tracking-wider">
                              Details
                            </summary>
                            <pre className="mt-2 text-[10px] leading-tight bg-black/30 rounded-md p-2 overflow-x-auto text-foreground/70 border border-border/[0.06] max-h-40">
{JSON.stringify(ev.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                        {!ev && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/40 italic">
                            Not yet reached
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {trace.artifact.processing_errors.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 mb-2">
                    Processing Errors
                  </p>
                  <pre className="text-[10px] leading-tight bg-red-500/[0.04] rounded-md p-3 overflow-x-auto text-red-200/80 border border-red-500/20">
{JSON.stringify(trace.artifact.processing_errors, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground/90 capitalize">{value}</p>
    </div>
  );
}
