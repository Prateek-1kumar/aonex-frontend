"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  ExternalLink,
  Globe,
  Monitor,
  Shield,
  Sparkles,
  RefreshCw,
  ImageOff,
} from "lucide-react";
import { api, type RecentIngestion, type SkuJson } from "@/lib/api";

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

function formatPrice(value: number, currency: string | null): string {
  const sym =
    currency === "USD" ? "$"
      : currency === "EUR" ? "€"
      : currency === "GBP" ? "£"
      : currency === "INR" ? "₹"
      : "";
  return `${sym}${value.toFixed(2)}${sym ? "" : ` ${currency ?? ""}`.trimEnd()}`;
}

function summarizeSku(sku: SkuJson): {
  thumb: string | null;
  title: string | null;
  brand: string | null;
  price: string | null;
  strike: string | null;
  rating: string | null;
  category: string | null;
} {
  const hero = sku.images.find((i) => i.role === "hero") ?? sku.images[0];
  const sale = sku.pricing.sale_price;
  const list = sku.pricing.list_price;
  const currency = sku.pricing.currency;

  let price: string | null = null;
  let strike: string | null = null;
  if (sale != null && list != null && sale < list) {
    price = formatPrice(sale, currency);
    strike = formatPrice(list, currency);
  } else if (list != null) {
    price = formatPrice(list, currency);
  } else if (sale != null) {
    price = formatPrice(sale, currency);
  }

  return {
    thumb: hero?.url ?? null,
    title: sku.title,
    brand: sku.brand,
    price,
    strike,
    rating: sku.ratings.average != null ? `★ ${sku.ratings.average}` : null,
    category: sku.category_path,
  };
}

export function RecentIngestions({ onRowClick, refreshSignal }: Props) {
  const [items, setItems] = useState<RecentIngestion[]>([]);
  const [skus, setSkus] = useState<Record<string, SkuJson | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setSkus({});
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

  // Fan out trace fetches so each row can display extracted SKU details.
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    const targets = items.filter((it) => it.status === "completed" || it.status === "needs_review");
    Promise.all(
      targets.map((it) =>
        api.getIngestionTrace(it.artifact_id)
          .then((trace) => ({ id: it.artifact_id, sku: trace.sku ?? null }))
          .catch(() => ({ id: it.artifact_id, sku: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      setSkus((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.id] = r.sku;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [items]);

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
        const skuState = skus[item.artifact_id];
        const isLoadingSku =
          (item.status === "completed" || item.status === "needs_review") &&
          skuState === undefined;
        const summary = skuState ? summarizeSku(skuState) : null;

        return (
          <button
            key={item.artifact_id}
            onClick={() => onRowClick(item.artifact_id)}
            className={[
              "w-full text-left flex items-start gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors group",
              idx > 0 ? "border-t border-border/[0.04]" : ""
            ].join(" ")}
          >
            {/* Thumbnail */}
            <div className="size-14 rounded-lg bg-white/[0.04] border border-border/[0.06] overflow-hidden flex items-center justify-center shrink-0">
              {summary?.thumb ? (
                <img
                  src={summary.thumb}
                  alt={summary.title ?? ""}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <ImageOff size={16} className="text-muted-foreground/40" strokeWidth={1.2} />
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`size-1.5 rounded-full ${tone.dot}`} />
                <p className="text-sm font-semibold text-foreground/95 truncate">
                  {summary?.title ?? shortUrl(item.final_url)}
                </p>
              </div>

              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/65 flex-wrap">
                {summary?.brand && (
                  <span className="text-foreground/75 font-medium">{summary.brand}</span>
                )}
                {summary?.brand && summary?.category && <span>·</span>}
                {summary?.category && <span className="truncate max-w-[260px]">{summary.category}</span>}
                {(summary?.brand || summary?.category) && (
                  <span className="text-muted-foreground/40">·</span>
                )}
                <span className="font-mono truncate" title={item.final_url}>
                  {shortUrl(item.final_url)}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground/55">
                <span className={`font-semibold ${tone.label}`}>
                  {item.status.replace("_", " ")}
                </span>
                <span className="normal-case tracking-normal text-muted-foreground/45">
                  {relativeTime(item.received_at)}
                </span>
                {item.escalated_to && (
                  <span
                    className={`flex items-center gap-1 font-semibold ${ESCALATION_TONE[item.escalated_to]}`}
                    title={item.escalation_reasons.length > 0 ? `Reasons: ${item.escalation_reasons.join(", ")}` : item.escalated_to}
                  >
                    {ESCALATION_ICON[item.escalated_to]}
                    {item.escalated_to}
                  </span>
                )}
                <span className="normal-case tracking-normal tabular-nums text-foreground/70">
                  {item.fact_count} <span className="text-muted-foreground/45">facts</span>
                </span>
                {item.cost_credits > 0 && (
                  <span className="normal-case tracking-normal tabular-nums text-rose-300/70">
                    {item.cost_credits}c
                  </span>
                )}
                {isLoadingSku && (
                  <span className="flex items-center gap-1 normal-case tracking-normal text-muted-foreground/45">
                    <Loader2 size={10} className="animate-spin" />
                    loading SKU
                  </span>
                )}
              </div>
            </div>

            {/* Price + rating column */}
            <div className="text-right shrink-0 min-w-[88px]">
              {summary?.price ? (
                <div className="flex items-baseline gap-1.5 justify-end">
                  <p className="text-sm font-bold tabular-nums text-foreground/90">
                    {summary.price}
                  </p>
                  {summary.strike && (
                    <p className="text-[10px] tabular-nums line-through text-muted-foreground/50">
                      {summary.strike}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/40">
                  {skuState === null ? "no SKU" : "—"}
                </p>
              )}
              {summary?.rating && (
                <p className="mt-0.5 text-[10px] tabular-nums text-amber-300/80">
                  {summary.rating}
                </p>
              )}
            </div>

            <ExternalLink
              size={12}
              className="mt-1 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0"
            />
          </button>
        );
      })}
    </div>
  );
}
