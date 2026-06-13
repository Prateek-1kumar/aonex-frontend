"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  X, Trash2, Copy, Check, Loader2, ChevronDown, AlertCircle, DollarSign,
  Package, Braces, Play, Wand2, ImageIcon, FileText, ShieldCheck, Anchor, TrendingUp, ListChecks,
} from "lucide-react";
import { api, type ProductQualityMetrics } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/format";
import { catalogStatusBadge } from "@/lib/status";
import type { CatalogProductView, PricingLeaf } from "../lib/catalog-types";

interface Props {
  productId: string;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Dig a winning-value leaf out of winning_values[attr][channel][locale].value. */
function extractWinningValue(wv: Record<string, unknown>, attr: string): unknown {
  try {
    const attrBlock = wv[attr];
    if (!attrBlock || typeof attrBlock !== "object" || Array.isArray(attrBlock)) return null;
    const byChannel = attrBlock as Record<string, unknown>;
    const chKeys = Object.keys(byChannel);
    const orderedCh = chKeys.includes("_unscoped") ? ["_unscoped", ...chKeys.filter((c) => c !== "_unscoped")] : chKeys;
    for (const ch of orderedCh) {
      const byLocale = byChannel[ch];
      if (!byLocale || typeof byLocale !== "object" || Array.isArray(byLocale)) continue;
      const locMap = byLocale as Record<string, unknown>;
      const locKeys = Object.keys(locMap);
      const orderedLoc = locKeys.includes("_unscoped") ? ["_unscoped", ...locKeys.filter((l) => l !== "_unscoped")] : locKeys;
      for (const loc of orderedLoc) {
        const leaf = locMap[loc];
        if (leaf == null) continue;
        if (typeof leaf === "object" && !Array.isArray(leaf) && "value" in (leaf as object)) {
          return (leaf as { value: unknown }).value;
        }
        return leaf;
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
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    const allScalar = v.every((x) => x == null || typeof x !== "object");
    return allScalar ? v.map(String).join(", ") : `${v.length} items`;
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, val]) => val != null);
    if (entries.length === 0) return "—";
    return entries.slice(0, 4)
      .map(([k, val]) => `${k}: ${typeof val === "object" ? JSON.stringify(val) : String(val)}`)
      .join(" · ");
  }
  return JSON.stringify(v);
}

function extractImages(wv: Record<string, unknown>): Array<{ url: string; role?: string; alt_text?: string | null }> {
  const val = extractWinningValue(wv, "images");
  if (!Array.isArray(val)) return [];
  return val.filter(
    (i): i is { url: string; role?: string; alt_text?: string | null } =>
      !!i && typeof i === "object" && typeof (i as { url?: unknown }).url === "string"
  );
}

function shortId(id: string): string {
  return id.length > 12 ? `…${id.slice(-8)}` : id;
}

const ACRONYMS = new Set(["gtin", "mpn", "sku", "upc", "ean", "asin", "url", "id", "uvp", "seo", "geo", "hs", "faq", "aeo"]);
function humanize(code: string): string {
  return code
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\s]+/).filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

function representativePrice(wv: CatalogProductView["winning_values"]): string | null {
  const pricing = wv.pricing;
  if (!pricing) return null;
  for (const byLocale of Object.values(pricing)) {
    for (const leaf of Object.values(byLocale)) {
      const p = formatPrice(leaf.primaryAmount, leaf.currency);
      if (p) return p;
    }
  }
  return null;
}

// Identity/internal keys shown in the header — never in the record body.
const RECORD_SKIP = new Set([
  "pricing", "inventory", "images", "_meta",
  "title", "brand", "gtin", "category_path", "asin",
]);
// Synthesized listing copy — routed to the collapsible Content & SEO section.
const CONTENT_KEYS = new Set([
  "description", "description_short", "description_long",
  "highlights", "key_features", "bullet_points",
  "meta_title", "meta_description", "seo_keywords", "tags", "search_keywords", "url_slug",
  "faq", "pros_cons", "use_cases", "aeo_summary", "target_audience",
]);

// ── Main component ──────────────────────────────────────────────────────────

export function ProductDetailModal({ productId, onClose, onDelete }: Props) {
  const router = useRouter();
  const [product, setProduct] = useState<CatalogProductView | null>(null);
  const [quality, setQuality] = useState<ProductQualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setShowJson(false);
    setQuality(null);
    api.catalog.get(productId, "strong")
      .then((p) => { if (!cancelled) setProduct(p); })
      .catch((e: Error) => { if (!cancelled) setLoadError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Quality is best-effort — the record renders fine without it.
    api.quality.product(productId)
      .then((q) => { if (!cancelled) setQuality(q); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
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
    try { await onDelete(productId); } finally { setDeleting(false); }
  }

  async function handlePushToEnrich() {
    setPushing(true);
    setPushError(null);
    try {
      await api.enrich.push([productId]);
      onClose();
      router.push("/enrichment");
    } catch (e) {
      setPushError((e as Error).message);
      setPushing(false);
    }
  }

  const headerThumb = useMemo(
    () => (product ? extractImages(product.winning_values)[0]?.url ?? null : null),
    [product]
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border/[0.1] bg-card shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border/[0.06] bg-card/95 backdrop-blur rounded-t-2xl overflow-hidden">
          <div className="pointer-events-none absolute -left-10 -top-16 size-52 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.3),transparent_70%)] opacity-50 blur-2xl" />
          <div className="relative flex items-center gap-3 min-w-0">
            <div className="grid size-9 place-items-center overflow-hidden rounded-lg border border-border/[0.1] bg-surface shrink-0">
              {headerThumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs
                <img src={headerThumb} alt="" className="size-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Package size={16} className="text-muted-foreground/40" strokeWidth={1.4} />
              )}
            </div>
            {product && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catalogStatusBadge(product.status).className}`}>
                {catalogStatusBadge(product.status).label}
              </span>
            )}
            <span className="font-mono text-[11px] text-muted-foreground/50 truncate">{productId.slice(0, 8)}</span>
          </div>
          <button
            onClick={onClose}
            className="relative size-9 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover hover:text-foreground flex items-center justify-center shrink-0 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body — a professional data record: facts first; content + images collapsed. */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading product…</span>
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle size={15} /> {loadError}
            </div>
          )}
          {pushError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle size={15} /> {pushError}
            </div>
          )}

          {product && (
            <>
              <TitleBlock product={product} onCopy={copy} copied={copied} />
              <QualityStrip quality={quality} />
              <RecordSection product={product} />
              <ContentSection product={product} />
              <ImagesSection product={product} />
              <PricingSection product={product} />

              {/* Raw-JSON disclosure */}
              <CollapsibleSection title="Raw JSON" icon={<Braces size={13} className="text-primary" />}>
                <div className="relative">
                  <button
                    onClick={() => copy("JSON", JSON.stringify(product.winning_values, null, 2))}
                    className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-border/[0.1] bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground/70 hover:text-foreground"
                  >
                    {copied === "JSON" ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    {copied === "JSON" ? "Copied" : "Copy"}
                  </button>
                  <pre className="text-[10px] leading-relaxed bg-code rounded-lg p-3 pt-9 overflow-auto max-h-80 text-foreground/60 border border-border/[0.06]">
                    {JSON.stringify(product.winning_values, null, 2)}
                  </pre>
                </div>
              </CollapsibleSection>
            </>
          )}
        </div>

        {/* Footer */}
        {product && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t border-border/[0.06] bg-card/95 backdrop-blur rounded-b-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => void handlePushToEnrich()}
                disabled={pushing}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-primary to-primary/85 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25 hover:brightness-110 active:translate-y-px transition-all disabled:opacity-40 disabled:shadow-none flex items-center gap-1.5"
              >
                {pushing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {pushing ? "Pushing…" : "Push to Enrich"}
              </button>
              <button
                onClick={() => copy("Product ID", product.product_id)}
                className="px-3 py-1.5 rounded-md bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover flex items-center gap-1.5"
              >
                {copied === "Product ID" ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                Product ID
              </button>
              {product.primary_identifier && (
                <button
                  onClick={() => copy("Primary ID", product.primary_identifier)}
                  className="px-3 py-1.5 rounded-md bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover flex items-center gap-1.5"
                >
                  {copied === "Primary ID" ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  Primary Identifier
                </button>
              )}
            </div>
            {onDelete && (
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                      className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-40">
                      Cancel
                    </button>
                    <button onClick={() => void handleDelete()} disabled={deleting}
                      className="px-3 py-1.5 rounded-md bg-danger/20 border border-danger/40 text-danger text-xs font-semibold hover:bg-danger/30 disabled:opacity-40 flex items-center gap-1.5">
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Confirm delete
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} disabled={deleting}
                    className="px-3 py-1.5 rounded-md bg-surface border border-border/[0.08] text-danger/80 text-xs font-semibold hover:bg-danger/10 disabled:opacity-40 flex items-center gap-1.5">
                    <Trash2 size={12} /> Delete
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

// ── Title block (compact, image-free) ───────────────────────────────────────

function TitleBlock({
  product, onCopy, copied,
}: {
  product: CatalogProductView;
  onCopy: (label: string, value: string) => void;
  copied: string | null;
}) {
  const wv = product.winning_values;
  const identity = (product.identity ?? {}) as Record<string, unknown>;
  const title = renderValue(extractWinningValue(wv, "title") ?? identity.title ?? null);
  const brand = renderValue(extractWinningValue(wv, "brand") ?? identity.brand ?? null);
  const category = renderValue(extractWinningValue(wv, "category_path") ?? product.family ?? null);
  const gtin = extractWinningValue(wv, "gtin") ?? identity.gtin ?? null;
  const asin = extractWinningValue(wv, "asin") ?? null;
  const price = representativePrice(wv);

  return (
    <div className="min-w-0">
      {(brand !== "—" || category !== "—") && (
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
          {brand !== "—" ? brand : ""}{brand !== "—" && category !== "—" ? " · " : ""}{category !== "—" ? category : ""}
        </p>
      )}
      <div className="mt-1.5 flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold leading-tight text-foreground/95">
          {title !== "—" ? title : <span className="text-muted-foreground/50 italic">Untitled product</span>}
        </h2>
        {price && <p className="font-serif text-2xl font-bold tabular-nums text-foreground shrink-0">{price}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {typeof gtin === "string" && <IdChip label="GTIN" value={gtin} onCopy={onCopy} copied={copied} />}
        {product.primary_identifier && <IdChip label="ID" value={product.primary_identifier} onCopy={onCopy} copied={copied} />}
        {typeof asin === "string" && <IdChip label="ASIN" value={asin} onCopy={onCopy} copied={copied} />}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/45">
        Created {formatDate(product.created_at)} · Updated {formatDate(product.updated_at)}
      </p>
    </div>
  );
}

// ── Quality strip (the credibility facts) ────────────────────────────────────

const PROV_DOTS: { key: keyof NonNullable<ProductQualityMetrics["provenanceBreakdown"]>; cls: string; label: string }[] = [
  { key: "grounded", cls: "bg-success", label: "grounded" },
  { key: "weak", cls: "bg-warning", label: "weak" },
  { key: "inferred", cls: "bg-muted-foreground/40", label: "inferred" },
  { key: "unverified", cls: "bg-danger/60", label: "unverified" },
  { key: "contradicted", cls: "bg-danger", label: "contradicted" },
];

function QualityStrip({ quality }: { quality: ProductQualityMetrics | null }) {
  if (!quality || !quality.enriched) return null;
  const prov = quality.provenanceBreakdown;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <QTile icon={<TrendingUp size={14} />} label="Completeness" value={quality.completeness == null ? "—" : Math.round(quality.completeness)} hint="/100" tone="success" />
      <QTile icon={<FileText size={14} />} label="Content quality" value={quality.contentQuality == null ? "—" : Math.round(quality.contentQuality)} hint="/100" tone="primary" />
      <QTile icon={<Anchor size={14} />} label="Grounding" value={quality.groundingRate == null ? "—" : `${Math.round(quality.groundingRate * 100)}%`} tone="success" />
      <QTile
        icon={<ListChecks size={14} />}
        label="Attributes"
        value={quality.attrsTotal ? `${quality.attrsFilled ?? 0}/${quality.attrsTotal}` : "—"}
      />
      {prov && PROV_DOTS.some((d) => prov[d.key] > 0) && (
        <div className="col-span-2 sm:col-span-4 flex items-center gap-3 rounded-lg border border-border/[0.07] bg-surface px-3 py-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
            <ShieldCheck size={12} /> Provenance
          </span>
          {PROV_DOTS.filter((d) => prov[d.key] > 0).map((d) => (
            <span key={d.key} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70" title={d.label}>
              <span className={`size-2 rounded-full ${d.cls}`} /> {prov[d.key]} {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QTile({ icon, label, value, hint, tone = "muted" }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string;
  tone?: "primary" | "success" | "muted";
}) {
  const valueCls = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-foreground/90";
  return (
    <div className="rounded-lg border border-border/[0.07] bg-surface px-3 py-2">
      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
        <span className="text-muted-foreground/40">{icon}</span>{label}
      </p>
      <p className={`mt-0.5 text-lg font-bold leading-none tabular-nums ${valueCls}`}>
        {value}{hint && <span className="ml-0.5 text-[11px] font-medium text-muted-foreground/40">{hint}</span>}
      </p>
    </div>
  );
}

// ── Record: ALL structured facts ─────────────────────────────────────────────

function RecordSection({ product }: { product: CatalogProductView }) {
  const wv = product.winning_values;
  const rows = useMemo(() => {
    return Object.keys(wv)
      .filter((k) => !RECORD_SKIP.has(k) && !CONTENT_KEYS.has(k) && !k.startsWith("_"))
      .map((k) => ({ key: k, value: renderValue(extractWinningValue(wv, k)) }))
      .filter((r) => r.value !== "—")
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [wv]);

  if (rows.length === 0) {
    return (
      <Section title={`Record · 0 facts`}>
        <p className="rounded-xl border border-border/[0.06] bg-surface px-4 py-3 text-xs text-muted-foreground/50">
          No structured attributes yet. Push to Enrich to extract them.
        </p>
      </Section>
    );
  }

  return (
    <Section title={`Record · ${rows.length} fact${rows.length === 1 ? "" : "s"}`}>
      <div className="rounded-xl border border-border/[0.06] bg-surface overflow-hidden">
        <dl className="grid sm:grid-cols-2">
          {rows.map((r, i) => (
            <div
              key={r.key}
              className={`grid grid-cols-[minmax(110px,40%)_1fr] gap-3 px-4 py-2.5 border-border/[0.04] ${i % 2 === 0 ? "sm:border-r" : ""} border-b`}
            >
              <dt className="text-xs font-medium text-muted-foreground/65">{humanize(r.key)}</dt>
              <dd className="text-xs font-medium text-foreground/90 break-words" title={r.value}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

// ── Content & SEO (collapsible) ──────────────────────────────────────────────

function ContentSection({ product }: { product: CatalogProductView }) {
  const wv = product.winning_values;
  const items = useMemo(
    () =>
      [...CONTENT_KEYS]
        .map((k) => ({ key: k, value: extractWinningValue(wv, k) }))
        .filter((x) => x.value != null && x.value !== "" && !(Array.isArray(x.value) && x.value.length === 0)),
    [wv]
  );
  if (items.length === 0) return null;

  return (
    <CollapsibleSection title={`Content & SEO · ${items.length}`} icon={<FileText size={13} className="text-primary" />} defaultOpen>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.key} className="rounded-lg border border-border/[0.06] bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{humanize(it.key)}</p>
            <div className="mt-1.5 text-sm text-foreground/85">{renderContentValue(it.key, it.value)}</div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function renderContentValue(key: string, value: unknown): React.ReactNode {
  // pros_cons: { pros: [], cons: [] }
  if (key === "pros_cons" && value && typeof value === "object" && !Array.isArray(value)) {
    const pc = value as { pros?: unknown; cons?: unknown };
    const pros = Array.isArray(pc.pros) ? pc.pros.map(String) : [];
    const cons = Array.isArray(pc.cons) ? pc.cons.map(String) : [];
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <ul className="space-y-1">{pros.map((p, i) => <li key={i} className="flex gap-1.5 text-success/90"><span>＋</span><span className="text-foreground/80">{p}</span></li>)}</ul>
        <ul className="space-y-1">{cons.map((c, i) => <li key={i} className="flex gap-1.5 text-danger/80"><span>－</span><span className="text-foreground/80">{c}</span></li>)}</ul>
      </div>
    );
  }
  // faq: [{ q/question, a/answer }]
  if (key === "faq" && Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((qa, i) => {
          const o = (qa ?? {}) as Record<string, unknown>;
          const q = String(o.q ?? o.question ?? "");
          const a = String(o.a ?? o.answer ?? "");
          return <div key={i}><p className="font-medium text-foreground/90">{q}</p><p className="text-foreground/65">{a}</p></div>;
        })}
      </div>
    );
  }
  // string lists → bullets
  if (Array.isArray(value)) {
    const scalar = value.filter((x) => x == null || typeof x !== "object").map(String);
    if (scalar.length > 0) {
      return (
        <ul className="flex flex-wrap gap-1.5">
          {scalar.map((s, i) => <li key={i} className="rounded-md bg-card border border-border/[0.08] px-2 py-0.5 text-xs text-foreground/75">{s}</li>)}
        </ul>
      );
    }
  }
  if (typeof value === "string") return <p className="leading-relaxed whitespace-pre-wrap">{value}</p>;
  return <p className="text-muted-foreground/70">{renderValue(value)}</p>;
}

// ── Images (collapsible) ─────────────────────────────────────────────────────

function ImagesSection({ product }: { product: CatalogProductView }) {
  const images = useMemo(() => extractImages(product.winning_values), [product]);
  if (images.length === 0) return null;
  return (
    <CollapsibleSection title={`Images · ${images.length}`} icon={<ImageIcon size={13} className="text-primary" />}>
      <ImageGallery images={images} />
    </CollapsibleSection>
  );
}

function ImageGallery({ images }: { images: Array<{ url: string; role?: string; alt_text?: string | null }> }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0] ?? null;
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,360px)_1fr]">
      <div className="aspect-square w-full rounded-xl border border-border/[0.08] bg-surface overflow-hidden flex items-center justify-center">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs
          <img src={current.url} alt={current.alt_text ?? "Product image"} className="size-full object-contain" />
        )}
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2 content-start">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              onClick={() => setActive(i)}
              className={[
                "relative size-14 shrink-0 rounded-lg overflow-hidden border bg-surface transition-colors",
                i === active ? "border-primary ring-2 ring-primary/30" : "border-border/[0.08] hover:border-border/20",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs */}
              <img src={img.url} alt={img.alt_text ?? `Image ${i + 1}`} className="size-full object-cover" loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
              {img.role === "video_thumb" && (
                <span className="absolute inset-0 flex items-center justify-center bg-overlay/40">
                  <Play size={14} className="text-foreground" fill="currentColor" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IdChip({ label, value, onCopy, copied }: {
  label: string; value: string; onCopy: (label: string, value: string) => void; copied: string | null;
}) {
  return (
    <button
      onClick={() => onCopy(label, value)}
      className="group inline-flex items-center gap-2 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5 hover:bg-surface-hover transition-colors"
      title={`Copy ${label}`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <span className="font-mono text-xs text-foreground/85">{value}</span>
      {copied === label ? <Check size={11} className="text-success" /> : <Copy size={11} className="text-muted-foreground/40 group-hover:text-foreground/70" />}
    </button>
  );
}

// ── Per-channel pricing ─────────────────────────────────────────────────────

function PricingSection({ product }: { product: CatalogProductView }) {
  const pricing = product.winning_values.pricing;
  if (!pricing || Object.keys(pricing).length === 0) return null;
  return (
    <CollapsibleSection title="Per-channel pricing" icon={<DollarSign size={13} className="text-primary" />}>
      <div className="space-y-2">
        {Object.entries(pricing).map(([channelId, byLocale]) => (
          <ChannelPricingBlock key={channelId} channelId={channelId} byLocale={byLocale} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function ChannelPricingBlock({ channelId, byLocale }: { channelId: string; byLocale: Record<string, PricingLeaf> }) {
  const [open, setOpen] = useState(false);
  const locales = Object.entries(byLocale);
  return (
    <div className="rounded-lg border border-border/[0.06] bg-surface overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-surface-hover transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/45">Channel</span>
          <span className="text-xs font-mono text-foreground/70 truncate">{channelId === "_unscoped" ? "Default" : shortId(channelId)}</span>
          <span className="text-[9px] text-muted-foreground/35 uppercase tracking-wider shrink-0">{locales.length} locale{locales.length === 1 ? "" : "s"}</span>
        </div>
        {locales[0] && (
          <span className="text-sm font-semibold tabular-nums text-foreground/85 shrink-0">{formatPrice(locales[0][1].primaryAmount, locales[0][1].currency) ?? "—"}</span>
        )}
        <ChevronDown size={13} className={`text-muted-foreground/40 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border/[0.06] divide-y divide-border/[0.04]">
          {locales.map(([locale, leaf]) => (
            <div key={locale} className="grid grid-cols-[100px_auto_1fr_auto] gap-3 px-3.5 py-2 text-xs items-center">
              <span className="font-mono text-muted-foreground/50 text-[10px]">{locale === "_unscoped" ? "default" : locale}</span>
              <span className="font-semibold tabular-nums text-foreground/85">{formatPrice(leaf.primaryAmount, leaf.currency) ?? "—"}</span>
              <span className="text-muted-foreground/40 text-[10px] truncate">{leaf.source}</span>
              <span className="text-muted-foreground/35 text-[10px] text-right">{formatDate(leaf.observedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{icon}{title}</p>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border/[0.1] bg-surface px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 hover:bg-surface-hover transition-colors"
      >
        {icon}{title}
        <ChevronDown size={13} className={`ml-auto text-muted-foreground/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
