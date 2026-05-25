"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Trash2,
  Copy,
  Check,
  Loader2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CatalogProductView, AttributeProvenance, PricingLeaf } from "../lib/catalog-types";

interface Props {
  productId: string;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely dig a winning value leaf out of the loosely-typed winning_values
 * tree. Path: winning_values[attr][channelId][locale].value
 *
 * Strategy: prefer _unscoped channel, then _unscoped locale, then first
 * available. Returns null defensively — never throws.
 */
function extractWinningValue(
  winningValues: Record<string, unknown>,
  attr: string
): { value: unknown; channel: string; locale: string } | null {
  try {
    const attrBlock = winningValues[attr];
    if (!attrBlock || typeof attrBlock !== "object" || Array.isArray(attrBlock)) return null;
    const byChannel = attrBlock as Record<string, unknown>;
    const channelKeys = Object.keys(byChannel).includes("_unscoped")
      ? ["_unscoped", ...Object.keys(byChannel).filter((c) => c !== "_unscoped")]
      : Object.keys(byChannel);
    for (const ch of channelKeys) {
      const byLocale = byChannel[ch];
      if (!byLocale || typeof byLocale !== "object" || Array.isArray(byLocale)) continue;
      const localeMap = byLocale as Record<string, unknown>;
      const localeKeys = Object.keys(localeMap).includes("_unscoped")
        ? ["_unscoped", ...Object.keys(localeMap).filter((l) => l !== "_unscoped")]
        : Object.keys(localeMap);
      for (const loc of localeKeys) {
        const leaf = localeMap[loc];
        if (leaf == null) continue;
        if (typeof leaf === "object" && !Array.isArray(leaf)) {
          const obj = leaf as Record<string, unknown>;
          if ("value" in obj) return { value: obj.value, channel: ch, locale: loc };
        }
        // Scalar leaf (old shape fallback)
        return { value: leaf, channel: ch, locale: loc };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function renderValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function shortId(id: string): string {
  // Shorten a UUID to first 8 chars for display
  return id.length > 12 ? `…${id.slice(-8)}` : id;
}

// Status badge colours
function statusTone(status: string): string {
  if (status === "active") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (status === "archived") return "bg-red-500/10 text-red-300 border-red-500/20";
  return "bg-amber-500/10 text-amber-300 border-amber-500/20";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductDetailModal({ productId, onClose, onDelete }: Props) {
  const [product, setProduct] = useState<CatalogProductView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Provenance: keyed by attr code → state
  const [provenance, setProvenance] = useState<
    Record<string, { loading: boolean; data: AttributeProvenance | null; error: string | null }>
  >({});
  // Section collapse state
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Load product detail on mount
  useEffect(() => {
    let cancelled = false;
    setProvenance({});
    setLoading(true);
    setLoadError(null);
    api.catalog
      .get(productId, "strong")
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(productId);
    } finally {
      setDeleting(false);
    }
  }

  // Load provenance for an attribute lazily
  async function loadProvenance(attr: string) {
    if (provenance[attr]) return; // already loading or loaded
    setProvenance((prev) => ({ ...prev, [attr]: { loading: true, data: null, error: null } }));
    try {
      const data = await api.catalog.attributeProvenance(productId, attr);
      setProvenance((prev) => ({ ...prev, [attr]: { loading: false, data, error: null } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setProvenance((prev) => ({ ...prev, [attr]: { loading: false, data: null, error: msg } }));
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-border/[0.06] bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            {product && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusTone(product.status)}`}>
                {product.status}
              </span>
            )}
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 truncate font-mono">
              {productId.slice(0, 8)}
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

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground/60">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading product…</span>
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={15} />
              {loadError}
            </div>
          )}

          {product && (
            <>
              {/* ── Identity + header ── */}
              <ProductHeader product={product} onCopy={copy} copied={copied} />

              {/* ── Winning attribute values ── */}
              <WinningValuesSection
                product={product}
                provenance={provenance}
                onLoadProvenance={loadProvenance}
              />

              {/* ── Per-channel pricing ── */}
              <PricingSection product={product} />

              {/* ── Raw JSON (collapsible) ── */}
              <details
                open={showRaw}
                onToggle={(e) => setShowRaw((e.target as HTMLDetailsElement).open)}
                className="group"
              >
                <summary className="cursor-pointer flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground/70 select-none">
                  <ChevronRight
                    size={11}
                    className="transition-transform group-open:rotate-90"
                  />
                  Raw winning_values JSON
                </summary>
                <pre className="mt-2 text-[10px] leading-tight bg-black/30 rounded-lg p-3 overflow-x-auto max-h-72 text-foreground/60 border border-border/[0.06]">
                  {JSON.stringify(product.winning_values, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>

        {/* Sticky footer */}
        {product && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t border-border/[0.06] bg-card/95 backdrop-blur">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => copy("Product ID", product.product_id)}
                className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-xs text-foreground/70 hover:bg-white/[0.07] flex items-center gap-1.5"
              >
                {copied === "Product ID" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                Product ID
              </button>
              {product.primary_identifier && (
                <button
                  onClick={() => copy("Primary ID", product.primary_identifier)}
                  className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-xs text-foreground/70 hover:bg-white/[0.07] flex items-center gap-1.5"
                >
                  {copied === "Primary ID" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  Primary Identifier
                </button>
              )}
            </div>
            {onDelete && (
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Confirm delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// ProductHeader
// ---------------------------------------------------------------------------

function ProductHeader({
  product,
  onCopy,
  copied,
}: {
  product: CatalogProductView;
  onCopy: (label: string, value: string) => void;
  copied: string | null;
}) {
  const wv = product.winning_values;

  // Extract identity fields defensively
  const identity = (product.identity ?? {}) as Record<string, unknown>;
  const title =
    extractWinningValue(wv, "title")?.value ??
    identity.title ??
    null;
  const brand =
    extractWinningValue(wv, "brand")?.value ??
    identity.brand ??
    null;
  const gtin =
    extractWinningValue(wv, "gtin")?.value ??
    identity.gtin ??
    null;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
        {renderValue(brand)}
        {product.family ? ` · ${product.family}` : ""}
      </p>
      <h2 className="mt-1.5 font-serif text-2xl font-bold text-foreground/95 leading-tight">
        {renderValue(title) !== "—" ? renderValue(title) : (
          <span className="text-muted-foreground/50 italic">Untitled product</span>
        )}
      </h2>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InfoTile label="GTIN" value={renderValue(gtin)}>
          {gtin && typeof gtin === "string" && (
            <button
              onClick={() => onCopy("GTIN", gtin)}
              className="text-muted-foreground/50 hover:text-foreground/80"
            >
              {copied === "GTIN" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          )}
        </InfoTile>
        <InfoTile label="Primary Identifier" value={product.primary_identifier} />
        <InfoTile label="Schema Version" value={product.schema_version} />
        <InfoTile
          label="Created"
          value={new Date(product.created_at).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        />
        <InfoTile
          label="Updated"
          value={new Date(product.updated_at).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        />
        <InfoTile label="Consistency" value={product.consistency} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WinningValuesSection
// ---------------------------------------------------------------------------

/**
 * Renders all winning attributes except the reserved `pricing` and
 * `inventory` blocks (those have dedicated sections).
 */
function WinningValuesSection({
  product,
  provenance,
  onLoadProvenance,
}: {
  product: CatalogProductView;
  provenance: Record<
    string,
    { loading: boolean; data: AttributeProvenance | null; error: string | null }
  >;
  onLoadProvenance: (attr: string) => void;
}) {
  const wv = product.winning_values;
  const SKIP = new Set(["pricing", "inventory"]);

  const attrs = Object.keys(wv).filter((k) => !SKIP.has(k));

  if (attrs.length === 0) {
    return (
      <Section title="Winning Values">
        <p className="text-xs text-muted-foreground/50 italic">No attribute values yet.</p>
      </Section>
    );
  }

  return (
    <Section title="Winning Values">
      <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] divide-y divide-border/[0.04]">
        {attrs.map((attr) => {
          const extracted = extractWinningValue(wv, attr);
          const prov = provenance[attr];
          return (
            <AttributeRow
              key={attr}
              attr={attr}
              extracted={extracted}
              prov={prov}
              onWhy={() => onLoadProvenance(attr)}
            />
          );
        })}
      </div>
    </Section>
  );
}

function AttributeRow({
  attr,
  extracted,
  prov,
  onWhy,
}: {
  attr: string;
  extracted: { value: unknown; channel: string; locale: string } | null;
  prov:
    | { loading: boolean; data: AttributeProvenance | null; error: string | null }
    | undefined;
  onWhy: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function handleWhy() {
    onWhy();
    setExpanded(true);
  }

  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-3">
        {/* Attr name */}
        <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0 min-w-[140px] pt-0.5">
          {attr}
        </span>
        {/* Value */}
        <span className="flex-1 text-xs text-foreground/85 break-words">
          {renderValue(extracted?.value)}
        </span>
        {/* Scope hints */}
        {extracted && (extracted.channel !== "_unscoped" || extracted.locale !== "_unscoped") && (
          <span className="text-[9px] font-mono text-muted-foreground/35 shrink-0">
            {extracted.channel !== "_unscoped" ? shortId(extracted.channel) : ""}
            {extracted.locale !== "_unscoped" ? `/${extracted.locale}` : ""}
          </span>
        )}
        {/* Why button */}
        <button
          onClick={handleWhy}
          className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 border border-border/[0.06] hover:text-primary/80 hover:border-primary/30 transition-colors"
          title="Show provenance"
        >
          <HelpCircle size={9} />
          why?
        </button>
      </div>

      {/* Provenance inline */}
      {expanded && prov && (
        <div className="mt-1.5 ml-[152px]">
          {prov.loading && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <Loader2 size={10} className="animate-spin" /> Loading…
            </span>
          )}
          {prov.error && (
            <span className="text-[10px] text-red-400/70">{prov.error}</span>
          )}
          {prov.data && (
            <ProvenanceInline data={prov.data} />
          )}
        </div>
      )}
    </div>
  );
}

function ProvenanceInline({ data }: { data: AttributeProvenance }) {
  return (
    <div className="rounded-md border border-border/[0.08] bg-black/20 px-2.5 py-2 text-[10px] space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-muted-foreground/50">Winner source:</span>
        <span className="font-semibold text-foreground/80">
          {data.observation_source ?? "—"}
        </span>
        {data.rule_fired && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground/50">
              rule #{data.rule_fired.rule_id} · priority {data.rule_fired.priority}
            </span>
          </>
        )}
      </div>
      {data.observation_observed_at && (
        <div className="text-muted-foreground/40">
          Observed: {new Date(data.observation_observed_at).toLocaleString()}
        </div>
      )}
      {data.artifact_id && (
        <div className="text-muted-foreground/40 font-mono">
          Artifact: {data.artifact_id.slice(0, 12)}…
        </div>
      )}
      {data.winner == null && (
        <div className="text-amber-400/70 italic">No winning observation for this attribute.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PricingSection
// ---------------------------------------------------------------------------

function PricingSection({ product }: { product: CatalogProductView }) {
  const pricing = product.winning_values.pricing;

  if (!pricing || Object.keys(pricing).length === 0) {
    return (
      <Section title="Per-Channel Pricing" icon={<DollarSign size={13} />}>
        <p className="text-xs text-muted-foreground/50 italic">No pricing data for this product.</p>
      </Section>
    );
  }

  return (
    <Section title="Per-Channel Pricing" icon={<DollarSign size={13} />}>
      <div className="space-y-2">
        {Object.entries(pricing).map(([channelId, byLocale]) => (
          <ChannelPricingBlock key={channelId} channelId={channelId} byLocale={byLocale} />
        ))}
      </div>
      <p className="mt-2 text-[9px] text-muted-foreground/35 italic">
        {/* TODO: resolve channel names (needs a channels endpoint) */}
        Channel labels are UUIDs — full channel names require a /channels endpoint (not yet available).
      </p>
    </Section>
  );
}

function ChannelPricingBlock({
  channelId,
  byLocale,
}: {
  channelId: string;
  byLocale: Record<string, PricingLeaf>;
}) {
  const [open, setOpen] = useState(false);
  const locales = Object.entries(byLocale);

  return (
    <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-muted-foreground/50 truncate">
            {shortId(channelId)}
          </span>
          <span className="text-[9px] text-muted-foreground/35 uppercase tracking-wider shrink-0">
            {locales.length} locale{locales.length === 1 ? "" : "s"}
          </span>
        </div>
        {/* Show first locale's price as preview */}
        {locales[0] && (() => {
          const n = Number(locales[0][1].primaryAmount);
          return (
            <span className="text-xs font-semibold tabular-nums text-foreground/80 shrink-0">
              {Number.isFinite(n)
                ? `${locales[0][1].currency} ${n.toLocaleString()}`
                : "—"}
            </span>
          );
        })()}
        <ChevronDown
          size={13}
          className={`text-muted-foreground/40 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/[0.06] divide-y divide-border/[0.04]">
          {locales.map(([locale, leaf]) => (
            <PricingLocaleRow key={locale} locale={locale} leaf={leaf} />
          ))}
        </div>
      )}
    </div>
  );
}

function PricingLocaleRow({ locale, leaf }: { locale: string; leaf: PricingLeaf }) {
  const amount =
    leaf.primaryAmount != null && Number.isFinite(Number(leaf.primaryAmount))
      ? Number(leaf.primaryAmount).toLocaleString()
      : null;

  return (
    <div className="grid grid-cols-[100px_auto_1fr_1fr] gap-3 px-3 py-1.5 text-xs items-center">
      <span className="font-mono text-muted-foreground/50 text-[10px]">
        {locale === "_unscoped" ? "unscoped" : locale}
      </span>
      <span className="font-semibold tabular-nums text-foreground/85">
        {leaf.currency} {amount ?? "—"}
      </span>
      <span className="text-muted-foreground/40 text-[10px] truncate">
        src: {leaf.source}
      </span>
      <span className="text-muted-foreground/35 text-[10px] text-right">
        {new Date(leaf.observedAt).toLocaleDateString()}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoTile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold truncate text-foreground/90" title={value}>
          {value || "—"}
        </p>
        {children}
      </div>
    </div>
  );
}
