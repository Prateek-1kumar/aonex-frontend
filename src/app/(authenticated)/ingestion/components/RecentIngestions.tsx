"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { formatPrice, formatRelativeTime } from "@/lib/format";

interface Props {
  onRowClick: (artifactId: string) => void;
  /** Trigger a refresh — bumped by the parent after a new ingestion is submitted. */
  refreshSignal: number;
}

const STATUS_PILL: Record<RecentIngestion["status"], { label: string; cls: string }> = {
  pending:      { label: "Pending",      cls: "border-border/[0.12] bg-surface text-muted-foreground/70" },
  processing:   { label: "Processing",   cls: "border-warning/25 bg-warning/12 text-warning" },
  completed:    { label: "Completed",    cls: "border-success/25 bg-success/12 text-success" },
  failed:       { label: "Failed",       cls: "border-danger/25 bg-danger/12 text-danger" },
  needs_review: { label: "Needs Review", cls: "border-warning/25 bg-warning/12 text-warning" },
};

function MetaChip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "danger" }) {
  return (
    <span className={[
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
      tone === "danger"
        ? "border-danger/20 bg-danger/10 text-danger/80"
        : "border-border/[0.08] bg-surface text-muted-foreground/65",
    ].join(" ")}>
      {children}
    </span>
  );
}

const ESCALATION_ICON = {
  static: <Globe size={11} />,
  browser: <Monitor size={11} />,
  unblock: <Shield size={11} />
};

const ESCALATION_TONE = {
  static: "text-foreground/60",
  browser: "text-warning",
  unblock: "text-danger"
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
    <div className="rounded-2xl border border-border/[0.07] bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/[0.06] bg-gradient-to-b from-surface/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Sparkles size={13} />
          </span>
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
          className="size-7 rounded-md bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover flex items-center justify-center disabled:opacity-40"
          aria-label="Refresh"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        </button>
      </div>

      {error && (
        <div className="px-5 py-3 text-xs text-danger bg-danger/5 flex items-center gap-2">
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
        const pill = STATUS_PILL[item.status] ?? STATUS_PILL.pending;
        const skuState = skus[item.artifact_id];
        const isLoadingSku =
          (item.status === "completed" || item.status === "needs_review") &&
          skuState === undefined;
        const summary = skuState ? summarizeSku(skuState) : null;
        const isCsv = item.source_type === "templated_csv";
        const primaryLabel = isCsv
          ? (item.filename ?? "CSV upload")
          : (summary?.title ?? shortUrl(item.final_url));

        return (
          <button
            key={item.artifact_id}
            onClick={() => onRowClick(item.artifact_id)}
            className={[
              "w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors group",
              idx > 0 ? "border-t border-border/[0.04]" : ""
            ].join(" ")}
          >
            {/* Thumbnail */}
            <div className="size-16 rounded-xl bg-surface border border-border/[0.08] overflow-hidden grid place-items-center shrink-0 shadow-sm">
              {summary?.thumb ? (
                <img
                  src={summary.thumb}
                  alt={summary.title ?? ""}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <ImageOff size={18} className="text-muted-foreground/35" strokeWidth={1.2} />
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground/95 truncate group-hover:text-primary transition-colors">
                {primaryLabel}
              </p>

              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/60 min-w-0">
                {summary?.brand && (
                  <span className="text-foreground/75 font-medium shrink-0">{summary.brand}</span>
                )}
                {summary?.brand && summary?.category && <span className="shrink-0">·</span>}
                {summary?.category && <span className="truncate max-w-[240px]">{summary.category}</span>}
                {(summary?.brand || summary?.category) && (
                  <span className="text-muted-foreground/40 shrink-0">·</span>
                )}
                <span className="font-mono truncate" title={isCsv ? (item.filename ?? "CSV upload") : item.final_url}>
                  {isCsv ? (item.filename ?? "CSV upload") : shortUrl(item.final_url)}
                </span>
              </div>

              {/* Chip row */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pill.cls}`}>
                  {pill.label}
                </span>
                <MetaChip>{formatRelativeTime(item.received_at)}</MetaChip>
                <MetaChip>{item.fact_count} facts</MetaChip>
                {item.escalated_to && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border border-border/[0.08] bg-surface px-1.5 py-0.5 text-[10px] font-semibold capitalize ${ESCALATION_TONE[item.escalated_to]}`}
                    title={item.escalation_reasons.length > 0 ? `Reasons: ${item.escalation_reasons.join(", ")}` : item.escalated_to}
                  >
                    {ESCALATION_ICON[item.escalated_to]}
                    {item.escalated_to}
                  </span>
                )}
                {item.cost_credits > 0 && <MetaChip tone="danger">{item.cost_credits}c</MetaChip>}
                {isCsv && item.error_count ? (
                  <MetaChip tone="danger">{item.error_count} row issue{item.error_count === 1 ? "" : "s"}</MetaChip>
                ) : null}
                {isLoadingSku && (
                  <MetaChip><Loader2 size={9} className="animate-spin" /> SKU</MetaChip>
                )}
              </div>
            </div>

            {/* Price + rating column */}
            <div className="text-right shrink-0 min-w-[92px]">
              {summary?.price ? (
                <div className="flex items-baseline gap-1.5 justify-end">
                  <p className="text-base font-bold tabular-nums text-foreground/90">
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
                <p className="mt-1 inline-flex items-center justify-end rounded-md border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-warning">
                  {summary.rating}
                </p>
              )}
            </div>

            <ExternalLink
              size={13}
              className="text-muted-foreground/25 group-hover:text-primary transition-colors shrink-0"
            />
          </button>
        );
      })}
    </div>
  );
}
