"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Trash2,
  Copy,
  Check,
  Code,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import {
  api,
  type CatalogProduct,
  type ProductProvenance,
  type ProvenanceRung,
  type SkuJson,
  type SkuSourceTag,
} from "@/lib/api";

interface Props {
  product: CatalogProduct;
  onClose: () => void;
  onDelete: () => Promise<void>;
  busy?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

export function ProductDetailModal({ product, onClose, onDelete, busy }: Props) {
  const v = product.current_version;
  const [imageIdx, setImageIdx] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sku, setSku] = useState<SkuJson | null>(null);
  const [skuLoading, setSkuLoading] = useState(true);
  const [skuError, setSkuError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  useEffect(() => {
    setSkuLoading(true);
    api
      .getCatalogProductSku(product.id)
      .then((r) => setSku(r.sku))
      .catch((e) => setSkuError((e as Error).message))
      .finally(() => setSkuLoading(false));
  }, [product.id]);

  // SkuJson is the primary source of truth. The thin canonical row is only used
  // for IDs, status, and as a last-resort fallback when SkuJson fails to rebuild.
  const title = sku?.title ?? v?.title ?? "Untitled product";
  const brand = sku?.brand ?? v?.brand ?? null;
  const gtin = sku?.gtin ?? v?.gtin ?? null;
  const mpn = sku?.mpn ?? null;
  const modelNumber = sku?.model_number ?? v?.modelNumber ?? null;
  const internalSku = sku?.sku ?? null;
  const category = sku?.category_path ?? product.canonicalCategory ?? null;
  const descShort = sku?.description_short ?? null;
  const descLong = sku?.description_long ?? v?.description ?? null;
  const breadcrumbs = sku?.breadcrumbs ?? [];
  const highlights = sku?.highlights ?? [];
  const ratings = sku?.ratings ?? null;
  const seller = sku?.seller ?? null;
  const pricing = sku?.pricing ?? null;
  const shipping = sku?.shipping ?? null;
  const warranty = sku?.warranty ?? null;
  const returnPolicy = sku?.return_policy ?? null;
  const attributes = sku?.attributes ?? {};
  const variants = sku?.variants ?? [];
  const meta = sku?._extraction_meta ?? null;
  const fieldSource = sku?._field_source ?? {};
  const fieldConfidence = sku?._field_confidence ?? {};
  const validationWarnings = meta?.validation_warnings ?? [];

  // Collapse Model/MPN/SKU into one row when they're the same string.
  // PDPs commonly emit all three with identical values; showing them
  // separately just creates visual noise.
  const identifiers = useMemo(() => {
    const seen = new Map<string, { label: string; field: string }>();
    const add = (label: string, field: string, value: unknown) => {
      if (value == null) return;
      const norm = String(value).trim();
      if (!norm) return;
      const existing = seen.get(norm);
      if (existing) {
        // Merge label: "Model 8844091" instead of three rows.
        existing.label = `${existing.label}/${label}`;
        return;
      }
      seen.set(norm, { label, field });
    };
    add("GTIN", "gtin", gtin);
    add("Model", "model_number", modelNumber);
    add("MPN", "mpn", mpn);
    add("SKU", "sku", internalSku);
    return Array.from(seen, ([value, meta]) => ({ value, label: meta.label, field: meta.field }));
  }, [gtin, modelNumber, mpn, internalSku]);

  // Recover rating/review_count from attributes when the canonical ratings.*
  // fields didn't get extracted (LLM sometimes puts them in attributes instead).
  const effectiveRating = useMemo(() => {
    const fromCanonical = ratings?.average != null ? ratings.average : null;
    const fromAttr =
      attributes.rating?.value ??
      attributes.average_rating?.value ??
      attributes.rating_average?.value ??
      null;
    const avg = fromCanonical ?? (typeof fromAttr === "number" ? fromAttr : Number(fromAttr));
    const countCanonical = ratings?.count ?? null;
    const countAttr =
      attributes.review_count?.value ??
      attributes.rating_count?.value ??
      attributes.reviews?.value ??
      null;
    const count = countCanonical ?? (typeof countAttr === "number" ? countAttr : Number(countAttr));
    return {
      average: Number.isFinite(avg) ? (avg as number) : null,
      count: Number.isFinite(count) ? (count as number) : null,
    };
  }, [ratings, attributes]);

  const images = useMemo(() => {
    if (sku?.images && sku.images.length > 0) {
      // Order: hero first, then by position.
      const sorted = [...sku.images].sort((a, b) => {
        if (a.role === "hero" && b.role !== "hero") return -1;
        if (b.role === "hero" && a.role !== "hero") return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      });
      return sorted.map((i) => ({
        url: i.url,
        altText: i.alt_text ?? undefined,
        role: i.role,
      }));
    }
    return (v?.images ?? []).map((i) => ({ ...i, role: undefined as undefined }));
  }, [sku, v]);

  const confidence = v ? Number(v.confidenceScore) * 100 : 0;

  const statusTone =
    product.status === "archived"
      ? "bg-red-500/10 text-red-300 border-red-500/20"
      : product.status === "active"
        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        : "bg-amber-500/10 text-amber-300 border-amber-500/20";

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-3.5 border-b border-border/[0.06] bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusTone}`}
            >
              {product.status}
            </span>
            {category && (
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 truncate">
                {category}
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/50 truncate">
              {product.id.slice(0, 8)}
            </span>
            {skuLoading && (
              <span className="text-[10px] font-mono text-muted-foreground/50 animate-pulse">
                rebuilding…
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body grid (image | detail) ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 p-6">
          {/* ─── Image column ─── */}
          <div>
            <div className="aspect-square rounded-xl bg-white/[0.03] border border-border/[0.06] overflow-hidden flex items-center justify-center relative">
              {images[imageIdx]?.url ? (
                <img
                  src={images[imageIdx]!.url}
                  alt={images[imageIdx]?.altText ?? title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-center text-muted-foreground/40">
                  <ImageIcon size={36} strokeWidth={1.2} />
                  <p className="mt-2 text-[10px] uppercase tracking-wider">No image</p>
                </div>
              )}
              {images[imageIdx]?.role && (
                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/60 text-foreground/80 border border-white/10">
                  {images[imageIdx]!.role}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setImageIdx((i) => (i - 1 + images.length) % images.length)}
                  className="size-7 rounded-md bg-white/[0.04] border border-border/[0.08] hover:bg-white/[0.07] flex items-center justify-center shrink-0"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex gap-1.5 flex-1 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIdx(i)}
                      className={`size-12 rounded-md overflow-hidden border-2 shrink-0 ${
                        i === imageIdx
                          ? "border-primary/70"
                          : "border-border/[0.06] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setImageIdx((i) => (i + 1) % images.length)}
                  className="size-7 rounded-md bg-white/[0.04] border border-border/[0.08] hover:bg-white/[0.07] flex items-center justify-center shrink-0"
                  aria-label="Next image"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            <p className="mt-2 text-[10px] text-muted-foreground/40 text-center tabular-nums">
              {imageIdx + 1} / {images.length || 1}
            </p>
          </div>

          {/* ─── Detail column ─── */}
          <div className="min-w-0 flex flex-col gap-5">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 truncate">
                {breadcrumbs.join(" › ")}
              </p>
            )}

            {/* Title */}
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground/95 leading-tight">
                {title}
              </h2>
              {brand && (
                <p className="mt-1.5 text-sm text-muted-foreground/80">
                  by <span className="text-foreground/90 font-semibold">{brand}</span>
                  {seller?.name && seller.name !== brand && (
                    <span className="text-muted-foreground/60">
                      {" · sold by "}
                      <span className="text-foreground/80">{seller.name}</span>
                      {seller.is_official && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/20 align-middle">
                          Official
                        </span>
                      )}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Price + rating headline */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <PriceHeadline pricing={pricing} />
              {effectiveRating.average != null && (
                <RatingHeadline average={effectiveRating.average} count={effectiveRating.count} />
              )}
            </div>

            {/* Short description */}
            {descShort && (
              <p className="text-sm text-foreground/75 leading-relaxed">{descShort}</p>
            )}

            {/* Identifiers (deduped) + Confidence + Variants count */}
            <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] divide-y divide-border/[0.04] text-xs">
              {identifiers.map((id) => (
                <div
                  key={id.value}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="text-muted-foreground/65 uppercase tracking-wider text-[10px] font-bold w-24 shrink-0">
                    {id.label}
                  </span>
                  <span className="font-mono text-foreground/85 truncate flex-1 min-w-0">
                    {id.value}
                  </span>
                  <button
                    onClick={() => copy(id.label, id.value)}
                    className="text-muted-foreground/40 hover:text-foreground/80 shrink-0"
                    aria-label={`Copy ${id.label}`}
                  >
                    {copied === id.label ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground/65 uppercase tracking-wider text-[10px] font-bold w-24 shrink-0">
                  Confidence
                </span>
                <span
                  className={`tabular-nums font-semibold ${
                    confidence >= 90
                      ? "text-emerald-300"
                      : confidence >= 60
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {confidence.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground/65 uppercase tracking-wider text-[10px] font-bold w-24 shrink-0">
                  Variants
                </span>
                <span className="tabular-nums text-foreground/85">
                  {variants.length || product.variants.length || 0}
                </span>
              </div>
              {category && (
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground/65 uppercase tracking-wider text-[10px] font-bold w-24 shrink-0">
                    Category
                  </span>
                  <span className="text-foreground/85 truncate">{category}</span>
                </div>
              )}
            </div>

            {/* Validation warnings */}
            {validationWarnings.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  {validationWarnings.map((w, i) => (
                    <div key={i}>
                      <span className="font-mono text-amber-300">{w.field}</span>{" "}
                      <span className="text-amber-200/85">— {w.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top highlights inline (first 4) — full list still rendered below */}
            {highlights.length > 0 && (
              <ul className="space-y-1.5 text-sm text-foreground/80">
                {highlights.slice(0, 4).map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary/60 shrink-0 mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
                {highlights.length > 4 && (
                  <li className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                    + {highlights.length - 4} more in highlights section
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* ── Highlights ──────────────────────────────────────────────── */}
        {highlights.length > 0 && (
          <Section title="Highlights" count={highlights.length} defaultOpen>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-foreground/80">
              {highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary/60 shrink-0">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Description ─────────────────────────────────────────────── */}
        {descLong && descLong !== descShort && (
          <Section title="Description">
            <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">
              {descLong}
            </p>
          </Section>
        )}

        {/* ── Attributes ──────────────────────────────────────────────── */}
        {Object.keys(attributes).length > 0 && (
          <Section title="Attributes" count={Object.keys(attributes).length} defaultOpen>
            <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] divide-y divide-border/[0.04]">
              {Object.entries(attributes).map(([k, a]) => (
                <div
                  key={k}
                  className={`grid ${showSources ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"} gap-3 px-3 py-2 text-xs items-center`}
                >
                  <span className="text-muted-foreground/75 font-mono">
                    {k.replace(/_/g, " ")}
                  </span>
                  <span className="text-foreground/90 text-right">
                    {formatAttrValue(a.value)}
                    {a.unit ? <span className="text-muted-foreground/60"> {a.unit}</span> : null}
                  </span>
                  {showSources && <SourcePill source={a.source} field={k} confidences={fieldConfidence} />}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Variants ────────────────────────────────────────────────── */}
        {variants.length > 0 && (
          <Section title="Variants" count={variants.length} defaultOpen={variants.length <= 6}>
            <div className="rounded-xl border border-border/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="grid grid-cols-[40px_minmax(0,1fr)_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/[0.06]">
                <span></span>
                <span>Options · SKU</span>
                <span className="text-right">Price</span>
                <span className="text-right">Barcode</span>
              </div>
              <div className="divide-y divide-border/[0.04]">
                {variants.map((vt, i) => {
                  const optStr = Object.entries(vt.option_values ?? {})
                    .map(([k, val]) => `${k}: ${val}`)
                    .join(" · ");
                  const price =
                    vt.pricing?.sale_price ?? vt.pricing?.list_price ?? null;
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[40px_minmax(0,1fr)_auto_auto] gap-3 px-3 py-2 text-xs items-center hover:bg-white/[0.02]"
                    >
                      <div className="size-10 rounded bg-white/[0.04] overflow-hidden flex items-center justify-center">
                        {vt.image_urls?.[0] ? (
                          <img
                            src={vt.image_urls[0]}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon size={14} className="text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground/90 truncate">{optStr || "—"}</div>
                        {vt.sku && (
                          <div className="font-mono text-[10px] text-muted-foreground/60 truncate">
                            {vt.sku}
                          </div>
                        )}
                      </div>
                      <span className="tabular-nums text-foreground/90 text-right whitespace-nowrap">
                        {price != null
                          ? formatPrice(price, vt.pricing?.currency ?? pricing?.currency ?? null)
                          : "—"}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/55 text-right truncate">
                        {vt.barcode ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* ── Shipping / warranty / returns ────────────────────────────── */}
        {(shipping?.free_shipping != null ||
          shipping?.shipping_cost != null ||
          shipping?.weight ||
          shipping?.dimensions ||
          warranty ||
          returnPolicy) && (
          <Section title="Logistics & policies">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {shipping?.free_shipping != null && (
                <DefRow label="Free shipping" value={shipping.free_shipping ? "Yes" : "No"} />
              )}
              {shipping?.shipping_cost != null && (
                <DefRow
                  label="Shipping cost"
                  value={formatPrice(shipping.shipping_cost, pricing?.currency ?? null)}
                />
              )}
              {shipping?.weight && (
                <DefRow
                  label="Weight"
                  value={`${shipping.weight.value} ${shipping.weight.unit}`}
                />
              )}
              {shipping?.dimensions && (
                <DefRow
                  label="Dimensions"
                  value={`${shipping.dimensions.length} × ${shipping.dimensions.width} × ${shipping.dimensions.height} ${shipping.dimensions.unit}`}
                />
              )}
              {warranty && <DefRow label="Warranty" value={warranty} />}
              {returnPolicy && <DefRow label="Return policy" value={returnPolicy} />}
            </dl>
          </Section>
        )}

        {/* ── Provenance ──────────────────────────────────────────────── */}
        <Provenance productId={product.id} />

        {/* ── Extraction meta footer ──────────────────────────────────── */}
        {meta && (
          <div className="px-6 py-3 mx-6 my-4 rounded-lg bg-white/[0.02] border border-border/[0.05] flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground/65">
            <span className="uppercase tracking-[0.18em] font-bold">Pipeline</span>
            {(["per_site", "structured", "dom", "llm-gap-fill", "vision"] as const).map((p) => (
              <span
                key={p}
                className={
                  meta.passes_run.includes(p)
                    ? "text-foreground/85"
                    : "text-muted-foreground/25"
                }
              >
                {p}
              </span>
            ))}
            <span className="ml-auto flex items-center gap-3">
              {meta.tokens_used > 0 && <span>{meta.tokens_used.toLocaleString()} tok</span>}
              <span>${meta.cost_usd.toFixed(4)}</span>
              <span>{(meta.latency_ms / 1000).toFixed(1)}s</span>
              <span className="uppercase">{meta.escalated_to}</span>
              {meta.budget_exceeded && <span className="text-amber-300">BUDGET</span>}
            </span>
          </div>
        )}

        {skuError && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            Failed to rebuild rich SkuJson: {skuError}
          </div>
        )}

        {/* ── Sticky footer ────────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-3 border-t border-border/[0.06] bg-card/95 backdrop-blur">
          <div className="flex items-center gap-2 flex-wrap">
            <FooterBtn
              onClick={() => copy("Product ID", product.id)}
              icon={copied === "Product ID" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              label="Product ID"
            />
            {v?.id && (
              <FooterBtn
                onClick={() => copy("Version ID", v.id)}
                icon={copied === "Version ID" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                label="Version ID"
              />
            )}
            <FooterBtn
              onClick={() => setShowSources((s) => !s)}
              icon={<Code size={12} />}
              label={showSources ? "Hide sources" : "Show sources"}
              active={showSources}
            />
            <FooterBtn
              onClick={() => setShowJson((s) => !s)}
              icon={<Code size={12} />}
              label={showJson ? "Hide JSON" : "SkuJson"}
              active={showJson}
            />
          </div>
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void onDelete()}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Trash2 size={12} />
                  Confirm delete
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* ── Raw SkuJson dump ─────────────────────────────────────────── */}
        {showJson && (
          <div className="px-6 pb-6">
            <pre className="text-[10px] leading-tight bg-black/30 rounded-lg p-3 overflow-x-auto max-h-[28rem] text-foreground/70 border border-border/[0.06]">
{sku
  ? JSON.stringify(sku, null, 2)
  : skuLoading
    ? "// Loading rich extraction…"
    : "// No rich extraction available"}
            </pre>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source pill (per-field provenance)
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<SkuSourceTag, string> = {
  structured: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "per-site": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  dom: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "llm-text": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "llm-hints": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "llm-link": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  vision: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  enrichment: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function SourcePill({
  source,
  field,
  confidences,
}: {
  source: SkuSourceTag | undefined;
  field: string;
  confidences: Record<string, number>;
}) {
  if (!source) return null;
  const klass = SOURCE_COLORS[source] ?? SOURCE_COLORS.enrichment;
  const conf = confidences[field];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-mono ${klass}`}
      title={`${field} · ${source}${conf != null ? ` · conf ${(conf * 100).toFixed(0)}%` : ""}`}
    >
      {source}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small layout building blocks
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-6 pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 border-t border-border/[0.05] text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-muted-foreground/40 tabular-nums">({count})</span>
          )}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-muted-foreground/50" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground/50" />
        )}
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}

function PriceHeadline({ pricing }: { pricing: SkuJson["pricing"] | null }) {
  const list = pricing?.list_price ?? null;
  const sale = pricing?.sale_price ?? null;
  const currency = pricing?.currency ?? null;
  const discount = pricing?.discount_percent ?? null;
  const hasSale = sale != null && list != null && sale < list;
  if (list == null && sale == null) {
    return <p className="text-sm text-muted-foreground/55">No price extracted</p>;
  }
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      {hasSale ? (
        <>
          <span className="text-3xl font-bold text-foreground/95 tabular-nums leading-none">
            {formatPrice(sale!, currency)}
          </span>
          <span className="text-sm line-through text-muted-foreground/55 tabular-nums">
            {formatPrice(list!, currency)}
          </span>
          {discount != null && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              −{Math.round(discount)}%
            </span>
          )}
        </>
      ) : (
        <span className="text-3xl font-bold text-foreground/95 tabular-nums leading-none">
          {formatPrice((list ?? sale)!, currency)}
        </span>
      )}
      {pricing?.price_per_unit && (
        <span className="text-[11px] text-muted-foreground/55 tabular-nums">
          {pricing.price_per_unit}
        </span>
      )}
    </div>
  );
}

function RatingHeadline({ average, count }: { average: number; count: number | null }) {
  const tone =
    average >= 4 ? "text-emerald-300" : average >= 3 ? "text-amber-300" : "text-red-300";
  return (
    <div className="text-right">
      <p className={`text-lg font-bold tabular-nums ${tone}`}>
        ★ {average.toFixed(1)}
      </p>
      {count != null && (
        <p className="text-[10px] text-muted-foreground/55 tabular-nums">
          {count.toLocaleString()} reviews
        </p>
      )}
    </div>
  );
}


function DefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground/55 uppercase tracking-wider text-[10px] font-bold shrink-0">
        {label}
      </dt>
      <dd className="text-foreground/85 break-words">{value}</dd>
    </div>
  );
}

function FooterBtn({
  onClick,
  icon,
  label,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean | undefined;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md border text-xs flex items-center gap-1.5 ${
        active
          ? "bg-primary/15 border-primary/30 text-primary"
          : "bg-white/[0.04] border-border/[0.08] text-foreground/70 hover:bg-white/[0.07]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatPrice(value: number, currency: string | null): string {
  const sym =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : currency === "INR"
            ? "₹"
            : "";
  return `${sym}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${sym ? "" : ` ${currency ?? ""}`.trimEnd()}`;
}

function formatAttrValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((x) => String(x)).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-rung provenance (legacy canonical-field source breakdown)
// ─────────────────────────────────────────────────────────────────────────────

const RUNG_TONE: Record<string, string> = {
  json_ld: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  opengraph: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  microdata: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  rdfa: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  nuxt: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  next_data: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  initial_state: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  shopify_probe: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  shopify_products_json: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  magento: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  woocommerce: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  algolia: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  breadcrumb_list: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  dom_heuristic: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  vision_llm: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20",
  llm_gap_fill: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

const RUNG_LABEL: Record<string, string> = {
  json_ld: "JSON-LD",
  opengraph: "OpenGraph",
  microdata: "Microdata",
  rdfa: "RDFa",
  nuxt: "Nuxt",
  next_data: "Next data",
  initial_state: "Initial state",
  shopify_probe: "Shopify probe",
  shopify_products_json: "Shopify JSON",
  magento: "Magento",
  woocommerce: "WooCommerce",
  algolia: "Algolia",
  breadcrumb_list: "Breadcrumb",
  dom_heuristic: "DOM heuristic",
  vision_llm: "Vision LLM",
  llm_gap_fill: "LLM gap-fill",
};

function rungChip(rung: ProvenanceRung) {
  if (rung.startsWith("per_site_parser:")) {
    const retailer = rung.split(":")[1] ?? "site";
    return {
      tone: "bg-primary/15 text-primary border-primary/25",
      label: `Per-site: ${retailer}`,
    };
  }
  return {
    tone: RUNG_TONE[rung as string] ?? "bg-white/[0.04] border-border/[0.08] text-foreground/70",
    label: RUNG_LABEL[rung as string] ?? rung,
  };
}

function Provenance({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductProvenance | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    api
      .getProductProvenance(productId)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [open, productId, data]);

  return (
    <div className="px-6 pb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 border-t border-border/[0.05] text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
          Per-field provenance
          {data && (
            <span className="text-muted-foreground/40 tabular-nums">({data.fields.length})</span>
          )}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-muted-foreground/50" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground/50" />
        )}
      </button>
      {open && (
        <div className="pt-2">
          {error && <p className="text-xs text-red-300">{error}</p>}
          {!data && !error && (
            <p className="text-xs text-muted-foreground/45 italic">Loading…</p>
          )}
          {data && data.fields.length === 0 && (
            <p className="text-xs text-muted-foreground/45">No provenance facts recorded.</p>
          )}
          {data && data.fields.length > 0 && (
            <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] divide-y divide-border/[0.04]">
              {data.fields.map((f, i) => {
                const chip = rungChip(f.rung);
                const conf = (f.confidence * 100).toFixed(0);
                const confTone =
                  f.confidence >= 0.9
                    ? "text-emerald-300"
                    : f.confidence >= 0.7
                      ? "text-amber-300"
                      : "text-red-300";
                return (
                  <div
                    key={`${f.canonical_path ?? f.raw_key}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 text-xs"
                  >
                    <span
                      className="font-mono text-foreground/80 truncate"
                      title={f.canonical_path ?? f.raw_key}
                    >
                      {f.canonical_path ?? (
                        <span className="text-muted-foreground/50">{f.raw_key}</span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${chip.tone}`}
                    >
                      {chip.label}
                    </span>
                    <span className={`ml-auto tabular-nums font-semibold ${confTone}`}>
                      {conf}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
