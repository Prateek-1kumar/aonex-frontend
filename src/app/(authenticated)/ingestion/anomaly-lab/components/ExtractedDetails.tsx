"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Copy, Check, ImageOff } from "lucide-react";

/**
 * Renders the full rich extraction for a staged product so reviewers see the
 * same richness the ingestion-history trace shows — not just the 5 canonical
 * gate fields in StagedProductForm.
 *
 * Data source: the staged row's `observations` blob is the full AdapterOutput,
 * whose `rawPayload` is the extracted SkuJson (identical to what the history
 * TraceModal renders). We render that structurally, then offer a raw-JSON
 * disclosure. Everything is defensive: link products carry a SkuJson rawPayload;
 * connector/CSV sources may carry a different shape, in which case the
 * structured sections stay empty and the raw-JSON disclosure still works.
 */

interface SkuImage {
  url?: string;
  role?: string;
  position?: number;
  alt_text?: string | null;
}

interface SkuVariant {
  sku?: string | null;
  barcode?: string | null;
  option_values?: Record<string, string>;
  pricing?: { list_price?: number | null; sale_price?: number | null; currency?: string | null };
}

interface RichSku {
  description_short?: string | null;
  description_long?: string | null;
  highlights?: string[];
  category_path?: string | null;
  breadcrumbs?: string[];
  ratings?: { average?: number | null; count?: number | null };
  seller?: { name?: string | null; is_official?: boolean | null };
  images?: SkuImage[];
  options?: Array<{ name: string; values: string[] }>;
  variants?: SkuVariant[];
  attributes?: Record<string, { value?: unknown; unit?: string | null }>;
  shipping?: {
    free_shipping?: boolean | null;
    shipping_cost?: number | null;
    weight?: { value: number; unit: string } | null;
  };
  warranty?: string | null;
  return_policy?: string | null;
  _extraction_meta?: {
    passes_run?: string[];
    cost_usd?: number;
    latency_ms?: number;
    escalated_to?: string;
  };
}

interface Props {
  observations: Record<string, unknown>;
}

function asString(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export function ExtractedDetails({ observations }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const sku = useMemo<RichSku | null>(() => {
    const rp = observations?.rawPayload;
    return rp && typeof rp === "object" && !Array.isArray(rp) ? (rp as RichSku) : null;
  }, [observations]);

  const rawJson = useMemo(
    () => JSON.stringify(sku ?? observations ?? null, null, 2),
    [sku, observations]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  const images = (sku?.images ?? []).filter((i) => typeof i?.url === "string");
  const highlights = sku?.highlights ?? [];
  const attributes = sku?.attributes ?? {};
  const attrEntries = Object.entries(attributes);
  const variants = sku?.variants ?? [];
  const meta = sku?._extraction_meta;

  return (
    <div className="rounded-xl border border-border/[0.08] bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Extracted Details
        </p>
        {meta?.escalated_to && (
          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            via {meta.escalated_to}
            {typeof meta.cost_usd === "number" ? ` · $${meta.cost_usd.toFixed(3)}` : ""}
          </span>
        )}
      </div>

      {/* Image strip */}
      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 12).map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs, no next/image loader configured
            <img
              key={`${img.url}-${i}`}
              src={img.url}
              alt={img.alt_text ?? `Image ${i + 1}`}
              title={img.role ?? undefined}
              className="size-16 rounded-lg object-cover border border-border/[0.08] shrink-0 bg-white/[0.03]"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40 italic">
          <ImageOff size={12} /> No images extracted
        </div>
      )}

      {/* Descriptions + highlights */}
      {(sku?.description_short || sku?.description_long) && (
        <Field label="Description">
          <p className="text-xs leading-relaxed text-foreground/75 whitespace-pre-wrap line-clamp-6">
            {sku?.description_long || sku?.description_short}
          </p>
        </Field>
      )}

      {highlights.length > 0 && (
        <Field label="Highlights">
          <ul className="list-disc pl-4 space-y-0.5 text-xs text-foreground/75">
            {highlights.slice(0, 8).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </Field>
      )}

      {/* Compact key/value grid for scalar facts */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {sku?.category_path && <KV label="Category" value={sku.category_path} />}
        {sku?.ratings && (sku.ratings.average != null || sku.ratings.count != null) && (
          <KV
            label="Ratings"
            value={`${sku.ratings.average ?? "—"}${
              sku.ratings.count != null ? ` (${sku.ratings.count})` : ""
            }`}
          />
        )}
        {sku?.seller?.name && (
          <KV
            label="Seller"
            value={`${sku.seller.name}${sku.seller.is_official ? " · official" : ""}`}
          />
        )}
        {sku?.warranty && <KV label="Warranty" value={sku.warranty} />}
        {sku?.return_policy && <KV label="Returns" value={sku.return_policy} />}
        {sku?.shipping?.free_shipping != null && (
          <KV label="Shipping" value={sku.shipping.free_shipping ? "Free" : "Paid"} />
        )}
      </div>

      {/* Attributes table */}
      {attrEntries.length > 0 && (
        <Field label={`Attributes (${attrEntries.length})`}>
          <div className="rounded-lg border border-border/[0.06] divide-y divide-border/[0.04] max-h-56 overflow-y-auto">
            {attrEntries.map(([code, entry]) => (
              <div key={code} className="flex items-start gap-3 px-2.5 py-1.5">
                <span className="text-[10px] font-mono text-muted-foreground/55 min-w-[120px] shrink-0 pt-0.5">
                  {code}
                </span>
                <span className="text-xs text-foreground/80 break-words">
                  {asString(entry?.value)}
                  {entry?.unit ? (
                    <span className="text-muted-foreground/40"> {entry.unit}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </Field>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <Field label={`Variants (${variants.length})`}>
          <div className="rounded-lg border border-border/[0.06] divide-y divide-border/[0.04] max-h-56 overflow-y-auto">
            {variants.slice(0, 50).map((v, i) => {
              const axes = v.option_values
                ? Object.entries(v.option_values)
                    .map(([k, val]) => `${k}: ${val}`)
                    .join(" · ")
                : "";
              const price =
                v.pricing && (v.pricing.sale_price ?? v.pricing.list_price) != null
                  ? `${v.pricing.currency ?? ""} ${
                      v.pricing.sale_price ?? v.pricing.list_price
                    }`.trim()
                  : null;
              return (
                <div key={v.sku ?? v.barcode ?? i} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                  <span className="text-xs text-foreground/80 truncate">
                    {axes || v.sku || v.barcode || `Variant ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {v.sku && (
                      <span className="text-[10px] font-mono text-muted-foreground/45">{v.sku}</span>
                    )}
                    {price && (
                      <span className="text-xs tabular-nums text-foreground/70">{price}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Field>
      )}

      {/* Raw JSON disclosure — parity with the ingestion-history trace view */}
      <details
        open={showRaw}
        onToggle={(e) => setShowRaw((e.target as HTMLDetailsElement).open)}
        className="group"
      >
        <summary className="cursor-pointer flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground/70 select-none">
          <span className="flex items-center gap-2">
            <ChevronRight size={11} className="transition-transform group-open:rotate-90" />
            Raw extracted JSON
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void handleCopy();
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/[0.08] text-[9px] font-semibold text-muted-foreground/60 hover:text-foreground/80 normal-case tracking-normal"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </summary>
        <pre className="mt-2 text-[10px] leading-tight bg-black/30 rounded-lg p-3 overflow-x-auto max-h-72 text-foreground/60 border border-border/[0.06] whitespace-pre-wrap break-words">
          {rawJson}
        </pre>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
        {label}
      </p>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">{label}</p>
      <p className="text-xs text-foreground/85 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
