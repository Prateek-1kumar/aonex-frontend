"use client";

import { Package } from "lucide-react";
import type { ListCatalogProductRow } from "../lib/catalog-types";
import { getDisplayPrice } from "../lib/price";

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

function HealthBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const colorClass =
    pct >= 80
      ? "bg-success"
      : pct >= 50
      ? "bg-warning"
      : "bg-danger";
  const textClass =
    pct >= 80
      ? "text-success"
      : pct >= 50
      ? "text-warning"
      : "text-danger";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-foreground/[0.07] overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${textClass}`}>
        {pct}
      </span>
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

export interface ProductCardProps {
  product: ListCatalogProductRow;
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const price = getDisplayPrice(product);
  const health = computeHealth(product);

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
      {/* Image tile */}
      <div className="relative aspect-square w-full bg-surface flex items-center justify-center overflow-hidden">
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
          <Package
            size={36}
            className="text-muted-foreground/25"
            strokeWidth={1.2}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Brand */}
        {product.brand && (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/55 truncate">
            {product.brand}
          </p>
        )}

        {/* Title */}
        <p className="text-sm font-semibold text-foreground/95 line-clamp-2 group-hover:text-primary transition-colors leading-snug flex-1">
          {product.title ?? (
            <span className="italic text-muted-foreground/50">Untitled</span>
          )}
        </p>

        {/* Category path */}
        {product.categoryPath && (
          <p className="text-[10px] text-muted-foreground/50 truncate">
            {product.categoryPath}
          </p>
        )}

        {/* Price + completeness */}
        <div className="mt-auto pt-1.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold tabular-nums text-foreground/90">
              {price?.text ?? (
                <span className="font-normal text-muted-foreground/35">—</span>
              )}
            </span>
          </div>
          <HealthBar value={health} />
        </div>
      </div>
    </div>
  );
}
