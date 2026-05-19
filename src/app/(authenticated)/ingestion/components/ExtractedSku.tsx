"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Info } from "lucide-react";
import type { SkuJson, SkuSourceTag } from "@/lib/api";

interface Props {
  sku: SkuJson | null;
}

const SOURCE_COLORS: Record<SkuSourceTag, string> = {
  "structured":  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "per-site":    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "dom":         "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "llm-text":    "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "llm-hints":   "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "llm-link":    "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "vision":      "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "enrichment":  "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function SourcePill({ source, field, sku }: { source?: SkuSourceTag | null | undefined; field: string; sku: SkuJson | null }) {
  if (!source) return null;
  const klass = SOURCE_COLORS[source] ?? SOURCE_COLORS.enrichment;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-mono ${klass}`}
      title={`${field}: ${source} (conf ${sku?._field_confidence[field] ?? "?"})`}
    >
      {source}
    </span>
  );
}

function Section({ title, count, defaultOpen = false, children }: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/[0.05] py-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {title} {count !== undefined && <span className="text-muted-foreground/60">({count})</span>}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="mt-2 text-sm text-foreground/85">{children}</div>}
    </div>
  );
}

export function ExtractedSku({ sku }: Props) {
  const [showJson, setShowJson] = useState(false);

  if (!sku) {
    return (
      <div className="mb-6 p-4 rounded-lg bg-white/[0.02] border border-border/[0.05] text-sm text-muted-foreground">
        No extracted SKU yet — ingestion may still be running.
      </div>
    );
  }

  const heroImg = sku.images.find((i) => i.role === "hero") ?? sku.images[0];
  const gallery = sku.images.filter((i) => i !== heroImg && (i.role === "gallery" || i.role === "lifestyle")).slice(0, 6);
  const meta = sku._extraction_meta;
  const warnings = meta.validation_warnings ?? [];

  return (
    <div className="mb-6 rounded-xl border border-border/[0.08] bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/[0.05]">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Extracted SKU
        </p>
        <button
          onClick={() => setShowJson(!showJson)}
          className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.07] text-[10px] font-mono uppercase"
        >
          {showJson ? "Rendered" : "JSON"}
        </button>
      </div>

      {showJson ? (
        <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[60vh]">{JSON.stringify(sku, null, 2)}</pre>
      ) : (
        <div className="p-4">
          {warnings.length > 0 && (
            <div className="mb-3 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <div>
                {warnings.map((w, i) => <div key={i}>{w.field}: {w.reason}</div>)}
              </div>
            </div>
          )}

          {/* Hero + thumbnails */}
          <div className="flex gap-4 mb-4">
            {heroImg && (
              <img
                src={heroImg.url}
                alt={heroImg.alt_text ?? ""}
                className="w-32 h-32 object-cover rounded-lg bg-white/[0.04]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate flex items-center gap-2">
                {sku.title ?? <em className="text-muted-foreground">no title</em>}
                <SourcePill source={sku._field_source["title"]} field="title" sku={sku} />
              </h2>
              <div className="mt-1 text-xs text-foreground/70 flex items-center gap-3 flex-wrap">
                {sku.brand && (
                  <span className="flex items-center gap-1">
                    Brand: <strong className="text-foreground">{sku.brand}</strong>
                    <SourcePill source={sku._field_source["brand"]} field="brand" sku={sku} />
                  </span>
                )}
                {sku.gtin && (
                  <span className="flex items-center gap-1">
                    GTIN: <span className="font-mono">{sku.gtin}</span>
                    <SourcePill source={sku._field_source["gtin"]} field="gtin" sku={sku} />
                  </span>
                )}
                {sku.ratings.average != null && (
                  <span>★ {sku.ratings.average} ({sku.ratings.count ?? "?"})</span>
                )}
              </div>

              {/* Pricing */}
              <div className="mt-2 flex items-baseline gap-2">
                {sku.pricing.sale_price != null && sku.pricing.list_price != null && sku.pricing.sale_price < sku.pricing.list_price ? (
                  <>
                    <span className="text-lg font-semibold text-foreground">{formatPrice(sku.pricing.sale_price, sku.pricing.currency)}</span>
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(sku.pricing.list_price, sku.pricing.currency)}</span>
                    {sku.pricing.discount_percent != null && (
                      <span className="text-xs text-emerald-400">-{Math.round(sku.pricing.discount_percent)}%</span>
                    )}
                  </>
                ) : sku.pricing.list_price != null ? (
                  <span className="text-lg font-semibold text-foreground">{formatPrice(sku.pricing.list_price, sku.pricing.currency)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">no price extracted</span>
                )}
                <SourcePill source={sku._field_source["list_price"] ?? sku._field_source["base_price"]} field="list_price" sku={sku} />
              </div>
            </div>
          </div>

          {/* Gallery thumbnails */}
          {gallery.length > 0 && (
            <div className="grid grid-cols-6 gap-1.5 mb-4">
              {gallery.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt_text ?? ""}
                  className="w-full h-16 object-cover rounded-md bg-white/[0.04]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ))}
            </div>
          )}

          {/* Variants */}
          {sku.variants.length > 0 && (
            <Section title="Variants" count={sku.variants.length} defaultOpen={sku.variants.length <= 4}>
              <div className="space-y-1.5">
                {sku.variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {v.image_urls[0] && (
                      <img src={v.image_urls[0]} alt="" className="w-8 h-8 rounded object-cover bg-white/[0.04]" />
                    )}
                    <span className="flex-1 truncate">
                      {Object.entries(v.option_values).map(([k, val]) => `${k}: ${val}`).join(" · ")}
                    </span>
                    {v.sku && <span className="font-mono text-muted-foreground">{v.sku}</span>}
                    {v.pricing.sale_price != null && (
                      <span>{formatPrice(v.pricing.sale_price, v.pricing.currency)}</span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {sku.description_long && (
            <Section title="Description">
              <div className="whitespace-pre-wrap text-xs text-foreground/75">{sku.description_long}</div>
            </Section>
          )}

          {sku.highlights.length > 0 && (
            <Section title="Highlights" count={sku.highlights.length}>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                {sku.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </Section>
          )}

          {Object.keys(sku.attributes).length > 0 && (
            <Section title="Attributes" count={Object.keys(sku.attributes).length}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(sku.attributes).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="text-foreground/85 truncate">
                      {String(v.value)}{v.unit ? ` ${v.unit}` : ""}
                    </span>
                    <SourcePill source={v.source} field={k} sku={sku} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(sku.shipping.weight || sku.shipping.dimensions || sku.shipping.shipping_cost != null) && (
            <Section title="Shipping">
              <div className="text-xs space-y-0.5">
                {sku.shipping.weight && <div>Weight: {sku.shipping.weight.value} {sku.shipping.weight.unit}</div>}
                {sku.shipping.dimensions && (
                  <div>Dimensions: {sku.shipping.dimensions.length} × {sku.shipping.dimensions.width} × {sku.shipping.dimensions.height} {sku.shipping.dimensions.unit}</div>
                )}
                {sku.shipping.shipping_cost != null && <div>Cost: {formatPrice(sku.shipping.shipping_cost, sku.pricing.currency)}</div>}
                {sku.shipping.free_shipping && <div className="text-emerald-300">Free shipping</div>}
              </div>
            </Section>
          )}

          {/* Provenance footer */}
          <div className="mt-4 pt-3 border-t border-border/[0.05] text-[10px] font-mono text-muted-foreground/70 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1"><Info size={10} /> Layers:</span>
            {["per_site","structured","dom","llm-gap-fill","vision"].map((p) => (
              <span key={p} className={meta.passes_run.includes(p) ? "text-foreground/85" : "opacity-30"}>
                {p}
              </span>
            ))}
            <span className="ml-auto">
              {meta.tokens_used > 0 && `${meta.tokens_used.toLocaleString()} tokens · `}
              ${meta.cost_usd.toFixed(4)} · {(meta.latency_ms / 1000).toFixed(1)}s · {meta.escalated_to}
              {meta.budget_exceeded && <span className="text-amber-300"> · BUDGET</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPrice(value: number, currency: string | null): string {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "INR" ? "₹" : "";
  return `${sym}${value.toFixed(2)}${sym ? "" : ` ${currency ?? ""}`.trimEnd()}`;
}
