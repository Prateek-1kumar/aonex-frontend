"use client";

import { useEffect, useState } from "react";
import {
  X,
  Archive,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/api";

interface Props {
  product: CatalogProduct;
  onClose: () => void;
  onArchive: () => Promise<void>;
  busy?: boolean;
}

export function ProductDetailModal({ product, onClose, onArchive, busy }: Props) {
  const v = product.current_version;
  const images = v?.images ?? [];
  const [imageIdx, setImageIdx] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const confidence = v ? Number(v.confidenceScore) * 100 : 0;
  const price =
    v?.basePrice && v.currency
      ? `${v.currency} ${Number(v.basePrice).toLocaleString()}`
      : v?.basePrice
        ? Number(v.basePrice).toLocaleString()
        : null;

  const statusTone =
    product.status === "archived"
      ? "bg-red-500/10 text-red-300 border-red-500/20"
      : product.status === "active"
        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        : "bg-amber-500/10 text-amber-300 border-amber-500/20";

  const axisKeys = Array.from(
    new Set(product.variants.flatMap((vt) => Object.keys(vt.variantAxes ?? {})))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-border/[0.06] bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusTone}`}
            >
              {product.status}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 truncate">
              Catalog · {v?.id?.slice(0, 8) ?? "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 p-6">
          {/* Image column */}
          <div>
            <div className="aspect-square rounded-xl bg-white/[0.04] border border-border/[0.06] overflow-hidden flex items-center justify-center">
              {images[imageIdx]?.url ? (
                <img
                  src={images[imageIdx]!.url}
                  alt={v?.title ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center text-muted-foreground/50">
                  <ImageIcon size={40} strokeWidth={1.2} />
                  <p className="mt-2 text-xs uppercase tracking-wider">No image</p>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setImageIdx((i) => (i - 1 + images.length) % images.length)}
                  className="size-7 rounded-md bg-white/[0.04] border border-border/[0.08] hover:bg-white/[0.07] flex items-center justify-center"
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
                        i === imageIdx ? "border-primary/70" : "border-border/[0.06] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setImageIdx((i) => (i + 1) % images.length)}
                  className="size-7 rounded-md bg-white/[0.04] border border-border/[0.08] hover:bg-white/[0.07] flex items-center justify-center"
                  aria-label="Next image"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Detail column */}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              {[v?.brand, product.canonicalCategory].filter(Boolean).join(" · ") || "Canonical product"}
            </p>
            <h2 className="mt-1.5 font-serif text-2xl font-bold text-foreground/95 leading-tight">
              {v?.title ?? "Untitled product"}
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Price" value={price ?? "—"} />
              <Stat
                label="Confidence"
                value={`${confidence.toFixed(0)}%`}
                tone={confidence >= 90 ? "emerald" : confidence >= 60 ? "amber" : "red"}
              />
              <Stat
                label="GTIN"
                value={v?.gtin ?? "—"}
                copyable={v?.gtin ? { label: "GTIN", value: v.gtin } : undefined}
                onCopy={copy}
                copied={copied}
              />
              <Stat
                label="Model"
                value={v?.modelNumber ?? "—"}
                copyable={v?.modelNumber ? { label: "Model", value: v.modelNumber } : undefined}
                onCopy={copy}
                copied={copied}
              />
            </div>

            {v?.description && (
              <details className="mt-5 group">
                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground/80">
                  Description
                </summary>
                <p className="mt-2 text-sm text-foreground/75 leading-relaxed whitespace-pre-line">
                  {v.description}
                </p>
              </details>
            )}

            {Object.keys(v?.merchantExtensionsJson ?? {}).length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
                  Attributes
                </p>
                <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] divide-y divide-border/[0.04]">
                  {Object.entries(v!.merchantExtensionsJson!).map(([k, val]) => (
                    <div key={k} className="flex justify-between gap-4 px-3 py-2 text-xs">
                      <span className="text-muted-foreground/70 font-mono">{k}</span>
                      <span className="text-foreground/85 text-right truncate">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Variants */}
        {product.variants.length > 0 && (
          <div className="px-6 pb-6">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <Tag size={12} />
                Variants
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground/40">
                {product.variants.length} SKU{product.variants.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-xl border border-border/[0.06] bg-white/[0.02] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="border-b border-border/[0.06] bg-white/[0.02]">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {axisKeys.map((k) => (
                      <th key={k} className="px-3 py-2 font-semibold capitalize">
                        {k}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold">Barcode</th>
                    <th className="px-3 py-2 font-semibold text-right">Price</th>
                    <th className="px-3 py-2 font-semibold text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/[0.04]">
                  {product.variants.map((vt) => (
                    <tr key={vt.id} className="hover:bg-white/[0.02]">
                      {axisKeys.map((k) => (
                        <td key={k} className="px-3 py-2 text-foreground/85">
                          {vt.variantAxes?.[k] ?? "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-mono text-foreground/70 text-[11px]">
                        {vt.sku || <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground/60 text-[11px]">
                        {vt.barcode || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/85">
                        {vt.price ? `${vt.currency ?? ""} ${Number(vt.price).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/70">
                        {vt.inventoryQuantity != null ? Number(vt.inventoryQuantity).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t border-border/[0.06] bg-card/95 backdrop-blur">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => copy("Product ID", product.id)}
              className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-xs text-foreground/70 hover:bg-white/[0.07] flex items-center gap-1.5"
            >
              {copied === "Product ID" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              Product ID
            </button>
            {v?.id && (
              <button
                onClick={() => copy("Version ID", v.id)}
                className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-xs text-foreground/70 hover:bg-white/[0.07] flex items-center gap-1.5"
              >
                {copied === "Version ID" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                Version ID
              </button>
            )}
            <button
              onClick={() => setShowJson((s) => !s)}
              className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-xs text-foreground/70 hover:bg-white/[0.07] flex items-center gap-1.5"
            >
              <ExternalLink size={12} />
              {showJson ? "Hide JSON" : "Raw JSON"}
            </button>
          </div>
          {product.status !== "archived" && (
            <div className="flex items-center gap-2">
              {confirmArchive ? (
                <>
                  <button
                    onClick={() => setConfirmArchive(false)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void onArchive()}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/25 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Archive size={12} />
                    Confirm archive
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmArchive(true)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Archive size={12} />
                  Archive
                </button>
              )}
            </div>
          )}
        </div>

        {showJson && (
          <div className="px-6 pb-6">
            <pre className="text-[10px] leading-tight bg-black/30 rounded-lg p-3 overflow-x-auto max-h-72 text-foreground/70 border border-border/[0.06]">
{JSON.stringify(product, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  copyable,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "red" | undefined;
  copyable?: { label: string; value: string } | undefined;
  onCopy?: ((label: string, value: string) => void) | undefined;
  copied?: string | null | undefined;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "red"
          ? "text-red-300"
          : "text-foreground/90";
  return (
    <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className={`text-sm font-semibold tabular-nums truncate ${toneClass}`} title={value}>
          {value}
        </p>
        {copyable && onCopy && (
          <button
            onClick={() => onCopy(copyable.label, copyable.value)}
            className="text-muted-foreground/50 hover:text-foreground/80"
            aria-label={`Copy ${copyable.label}`}
          >
            {copied === copyable.label ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}
