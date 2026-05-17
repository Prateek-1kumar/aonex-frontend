"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, ExternalLink, Globe, Monitor, Shield, Sparkles, RefreshCw } from "lucide-react";
import { api, type RecentIngestion } from "@/lib/api";

interface Props {
  onRowClick: (artifactId: string) => void;
  /** Trigger a refresh — bumped by the parent after a new ingestion is submitted. */
  refreshSignal: number;
}

const STATUS_TONE: Record<RecentIngestion["status"], { dot: string; label: string }> = {
  pending:      { dot: "bg-muted-foreground/50",     label: "text-muted-foreground/70" },
  processing:   { dot: "bg-amber-400",                label: "text-amber-300" },
  completed:    { dot: "bg-emerald-400",              label: "text-emerald-300" },
  failed:       { dot: "bg-red-400",                  label: "text-red-300" },
  needs_review: { dot: "bg-amber-400",                label: "text-amber-300" }
};

const ESCALATION_ICON = {
  static: <Globe size={11} />,
  browser: <Monitor size={11} />,
  unblock: <Shield size={11} />
};

const ESCALATION_TONE = {
  static: "text-foreground/60",
  browser: "text-amber-300",
  unblock: "text-rose-300"
};

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 28 ? u.pathname.slice(0, 28) + "…" : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url.length > 50 ? url.slice(0, 50) + "…" : url;
  }
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function RecentIngestions({ onRowClick, refreshSignal }: Props) {
  const [items, setItems] = useState<RecentIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listRecentIngestions(20);
      setItems(res.ingestions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [refreshSignal]);

  return (
    <div className="rounded-xl border border-border/[0.07] bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-primary/100" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Recent Ingestions
          </p>
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {items.length > 0 ? `(${items.length})` : ""}
          </span>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="size-7 rounded-md bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center disabled:opacity-40"
          aria-label="Refresh"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        </button>
      </div>

      {error && (
        <div className="px-5 py-3 text-xs text-red-300 bg-red-500/5 flex items-center gap-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground/60">No link ingestions yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Paste a marketplace URL above to begin extraction.
          </p>
        </div>
      )}

      {items.map((item, idx) => {
        const tone = STATUS_TONE[item.status] ?? STATUS_TONE.pending;
        return (
          <button
            key={item.artifact_id}
            onClick={() => onRowClick(item.artifact_id)}
            className={[
              "w-full text-left grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors group",
              idx > 0 ? "border-t border-border/[0.04]" : ""
            ].join(" ")}
          >
            <div className={`size-1.5 rounded-full ${tone.dot}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate" title={item.final_url}>
                {shortUrl(item.final_url)}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground/50">
                <span className={`uppercase tracking-wider font-semibold ${tone.label}`}>
                  {item.status.replace("_", " ")}
                </span>
                <span>·</span>
                <span>{relativeTime(item.received_at)}</span>
              </div>
            </div>

            {item.escalated_to && (
              <div
                className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${ESCALATION_TONE[item.escalated_to]}`}
                title={item.escalation_reasons.length > 0 ? `Reasons: ${item.escalation_reasons.join(", ")}` : item.escalated_to}
              >
                {ESCALATION_ICON[item.escalated_to]}
                {item.escalated_to}
              </div>
            )}

            <div className="text-[11px] tabular-nums text-foreground/70">
              {item.fact_count} <span className="text-muted-foreground/50">facts</span>
            </div>

            {item.cost_credits > 0 && (
              <div className="text-[11px] tabular-nums text-rose-300/70">
                {item.cost_credits}c
              </div>
            )}

            <ExternalLink size={12} className="text-muted-foreground/30 group-hover:text-foreground/60 transition-colors justify-self-end" />
          </button>
        );
      })}
    </div>
  );
}
