"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { api, type IngestionTrace } from "@/lib/api";
import Link from "next/link";

interface Props {
  artifactId: string;
  onClose: () => void;
}

type Tab = "sku" | "events" | "all";

export function TraceModal({ artifactId, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [trace, setTrace] = useState<IngestionTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sku");
  const [copied, setCopied] = useState(false);

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

  const isCsv = trace?.source_type === "templated_csv";

  const payload = useMemo(() => {
    if (!trace) return null;
    if (tab === "sku") return trace.sku ?? null;
    if (tab === "events") return trace.events;
    return trace;
  }, [trace, tab]);

  const json = useMemo(() => {
    if (payload === null || payload === undefined) return "null";
    return JSON.stringify(payload, null, 2);
  }, [payload]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/[0.06]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Ingestion Trace
            </p>
            <p className="mt-0.5 text-sm font-mono text-foreground/90 truncate">
              {trace?.artifact?.source_external_id ?? trace?.filename ?? artifactId}
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

        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border/[0.06]">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-border/[0.06]">
            {(["sku", "events", "all"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  tab === t
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground/60 hover:text-foreground/80",
                ].join(" ")}
              >
                {t === "sku" ? (isCsv ? "Ingested Products" : "Extracted SKU") : t === "events" ? "Events" : "Full Trace"}
              </button>
            ))}
          </div>
          <button
            onClick={() => void handleCopy()}
            disabled={!trace}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] disabled:opacity-40"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
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

          {trace && isCsv && tab === "sku" ? (
            <div className="space-y-6">
              {/* Row validation warning log */}
              <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} className="text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Row Validation & Warning Log</h4>
                </div>
                {(trace.processing_errors ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">All rows passed validation checks without warnings.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                    {(trace.processing_errors ?? []).map((e, i) => {
                      const isWarning = e.code === "INVALID_GTIN" || e.code === "INVALID_IMAGE_URL" || e.code === "UNKNOWN_COLUMN";
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs font-mono">
                          <span className="text-muted-foreground/60 shrink-0">Row {e.row}:</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${isWarning ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>
                            {e.code}
                          </span>
                          <span className="text-foreground/80 break-words">{e.message}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ingested Products deep-linking report */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Ingested Products</h4>
                {!trace.children || trace.children.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No product groups found.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/[0.06] bg-black/10">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/[0.06] bg-white/[0.02] text-muted-foreground/60 font-semibold">
                          <th className="px-4 py-2.5">Primary Identifier</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/[0.04]">
                        {trace.children.map((child: any) => {
                          const rawChild = (child.raw_data ?? {}) as Record<string, any>;
                          const outcome = rawChild.outcome;
                          const productId = rawChild.productId;
                          const stagedProductId = rawChild.stagedProductId;

                          let statusColor = "text-muted-foreground";
                          let statusLabel = child.status;
                          let actionLink = null;
                          let actionLabel = "";

                          if (child.status === "completed" && outcome === "admitted") {
                            statusColor = "text-emerald-400 font-medium";
                            statusLabel = "Live (Catalog)";
                            if (productId) {
                              actionLink = `/catalog?id=${productId}`;
                              actionLabel = "View in Catalog";
                            }
                          } else if (child.status === "needs_review" && outcome === "staged") {
                            statusColor = "text-amber-400 font-medium";
                            statusLabel = "Needs Review";
                            if (stagedProductId) {
                              actionLink = `/ingestion/anomaly-lab?id=${stagedProductId}`;
                              actionLabel = "View in Anomaly Lab";
                            }
                          } else if (child.status === "failed") {
                            statusColor = "text-red-400 font-medium";
                            statusLabel = "Failed";
                          }

                          return (
                            <tr key={child.id} className="hover:bg-white/[0.01]">
                              <td className="px-4 py-2.5 font-mono text-foreground/90">{child.external_id}</td>
                              <td className="px-4 py-2.5">
                                <span className={statusColor}>{statusLabel}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {actionLink ? (
                                  <Link
                                    href={actionLink}
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                                    onClick={onClose}
                                  >
                                    {actionLabel}
                                    <ExternalLink size={10} />
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            trace && (
              <pre className="text-[11px] leading-relaxed font-mono bg-black/30 rounded-lg p-4 border border-border/[0.06] text-foreground/85 whitespace-pre-wrap break-words">
                {json}
              </pre>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
