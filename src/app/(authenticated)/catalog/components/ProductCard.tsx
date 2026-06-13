"use client";

import { Package, Sparkles } from "lucide-react";
import type { ListCatalogProductRow } from "../lib/catalog-types";
import { getDisplayPrice } from "../lib/price";
import { catalogStatusBadge } from "@/lib/status";

// ── Completeness helpers ──────────────────────────────────────────────────────

function computeHealth(p: ListCatalogProductRow): number {
  if (p.completenessScore != null) return Math.round(p.completenessScore);
  let s = 0;
  if (p.title) s += 20;
  if (p.brand) s += 20;
  if (p.category) s += 20;
  if (p.gtin) s += 20;
  if (p.pricing?.amount) s += 20;
  return s;
}

/** Token-class triplet for a 0–100 score. */
function tone(pct: number): { text: string; bar: string } {
  if (pct >= 80) return { text: "text-success", bar: "bg-success" };
  if (pct >= 50) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-danger", bar: "bg-danger" };
}

// ── ProductCard ───────────────────────────────────────────────────────────────

export interface ProductCardProps {
  product: ListCatalogProductRow;
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const price = getDisplayPrice(product);
  const health = computeHealth(product);
  const t = tone(health);
  const cq = product.contentQualityScore;
  const status = catalogStatusBadge(product.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex flex-col rounded-2xl border border-border/[0.08] bg-card hover:bg-surface-hover transition-colors cursor-pointer shadow-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Compact image banner + thumbnail — info, not hero */}
      <div className="relative h-24 w-full bg-surface flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs
          <img
            src={product.imageUrl}
            alt=""
            className="size-full object-cover transition-transform group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Package size={26} className="text-muted-foreground/25" strokeWidth={1.2} />
        )}
        {/* Status pill overlaid so the image stays small */}
        <span
          className={`absolute top-2 right-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Content — the focus */}
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        {product.brand && (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/55 truncate">
            {product.brand}
          </p>
        )}

        <p className="text-sm font-semibold text-foreground/95 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {product.title ?? <span className="italic text-muted-foreground/50">Untitled</span>}
        </p>

        {product.categoryPath && (
          <p className="text-[10px] text-muted-foreground/45 truncate">{product.categoryPath}</p>
        )}

        {/* Metrics block — price + health get the room the image used to take */}
        <div className="mt-auto pt-2.5 grid grid-cols-2 gap-2 border-t border-border/[0.06]">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/45">
              Price
            </p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-foreground/95 truncate">
              {price?.text ?? <span className="font-normal text-muted-foreground/35">—</span>}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/45">
              Health
            </p>
            <p className={`mt-0.5 text-base font-bold tabular-nums ${t.text}`}>
              {health}
              <span className="text-[10px] font-medium text-muted-foreground/40">/100</span>
            </p>
          </div>
        </div>

        {/* Completeness bar */}
        <div className="mt-1.5 h-1.5 rounded-full bg-foreground/[0.07] overflow-hidden">
          <div
            className={`h-full rounded-full ${t.bar} transition-all`}
            style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
          />
        </div>

        {/* Content quality — an enrichment signal, when present */}
        {cq != null && (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/55">
            <Sparkles size={10} className="text-primary/70" />
            Content quality
            <span className="font-bold tabular-nums text-foreground/75">{Math.round(cq)}</span>
            <span className="text-muted-foreground/35">/100</span>
          </p>
        )}
      </div>
    </div>
  );
}
