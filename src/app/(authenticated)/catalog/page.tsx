"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Package,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ListCatalogProductRow } from "./lib/catalog-types";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { getDisplayPrice } from "./lib/price";

type Toast = { type: "success" | "error"; message: string } | null;
type TabKey = "all" | "needs_enrichment" | "active" | "draft" | "archived";

// ── Health: an honest, explainable completeness score (0–100) ───────────────
// 20 pts each for the canonical fields we actually have in the list payload.
// Not a fabricated metric — it reflects exactly how filled-out a SKU is.
function computeHealth(p: ListCatalogProductRow): number {
  let s = 0;
  if (p.title) s += 20;
  if (p.brand) s += 20;
  if (p.category) s += 20;
  if (p.gtin) s += 20;
  if (p.pricing?.amount) s += 20;
  return s;
}

const NEEDS_ENRICHMENT_BELOW = 100; // anything not fully complete needs enrichment

export default function CatalogPage() {
  const [products, setProducts] = useState<ListCatalogProductRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;
  const [toast, setToast] = useState<Toast>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const handleClose = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    setBusy(true);
    try {
      const res = await api.catalog.list({ limit: PAGE_SIZE });
      setProducts(res.products);
      setNextCursor(res.nextCursor);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.catalog.list({ limit: PAGE_SIZE, cursor: nextCursor });
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.products.filter((p) => !seen.has(p.id))];
      });
      setNextCursor(res.nextCursor);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoadingMore(false);
    }
  }

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  // Health is pure over the row — memoise per product id for the render pass.
  const healthOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.id, computeHealth(p));
    return m;
  }, [products]);

  const counts = useMemo(() => {
    let needs = 0, active = 0, draft = 0, archived = 0, uncategorised = 0, healthSum = 0;
    for (const p of products) {
      const h = healthOf.get(p.id) ?? 0;
      healthSum += h;
      if (h < NEEDS_ENRICHMENT_BELOW) needs += 1;
      if (!p.category) uncategorised += 1;
      if (p.status === "active") active += 1;
      else if (p.status === "draft") draft += 1;
      else if (p.status === "archived") archived += 1;
    }
    return {
      total: products.length,
      needs, active, draft, archived, uncategorised,
      avgHealth: products.length ? Math.round(healthSum / products.length) : 0,
    };
  }, [products, healthOf]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (tab === "needs_enrichment" && (healthOf.get(p.id) ?? 0) >= NEEDS_ENRICHMENT_BELOW) return false;
      if (tab === "active" && p.status !== "active") return false;
      if (tab === "draft" && p.status !== "draft") return false;
      if (tab === "archived" && p.status !== "archived") return false;
      if (!term) return true;
      return [p.title, p.brand, p.category, p.gtin, p.id]
        .filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [products, tab, search, healthOf]);

  function exportCsv() {
    const head = ["id", "title", "brand", "category", "gtin", "price", "status", "health"];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head.join(",")];
    for (const p of filtered) {
      lines.push([
        p.id, p.title ?? "", p.brand ?? "", p.category ?? "", p.gtin ?? "",
        getDisplayPrice(p)?.text ?? "", p.status, `${healthOf.get(p.id) ?? 0}`,
      ].map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalog-export-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleAll() {
    setChecked((prev) => {
      if (prev.size >= filtered.length && filtered.length > 0) return new Set();
      return new Set(filtered.map((p) => p.id));
    });
  }
  function toggleOne(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const TABS: { key: TabKey; label: string; count: number; dot: string }[] = [
    { key: "all", label: "All Assets", count: counts.total, dot: "bg-primary" },
    { key: "needs_enrichment", label: "Needs Enrichment", count: counts.needs, dot: "bg-amber-400" },
    { key: "active", label: "Active", count: counts.active, dot: "bg-emerald-400" },
    { key: "draft", label: "Draft", count: counts.draft, dot: "bg-slate-400" },
    { key: "archived", label: "Archived", count: counts.archived, dot: "bg-rose-400" },
  ];

  const allChecked = filtered.length > 0 && checked.size >= filtered.length;

  return (
    <div className="animate-in max-w-8xl pb-16">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground leading-none">Master Catalog</h1>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            SKU Intelligence &amp; Distribution Hub
          </p>
        </div>
      </div>

      {/* Tab bar + actions */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "group flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors border",
                  on
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-white/[0.02] border-border/[0.06] text-muted-foreground/70 hover:text-foreground/90 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <span className={`size-1.5 rounded-full ${on ? t.dot : "bg-current opacity-40"}`} />
                {t.label}
                <span className={[
                  "tabular-nums rounded-full px-1.5 text-[10px] font-bold",
                  on ? "bg-primary/15 text-primary" : "bg-white/[0.05] text-muted-foreground/60",
                ].join(" ")}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className={[
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] border transition-colors",
              showSearch ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-white/[0.03] border-border/[0.08] text-foreground/70 hover:bg-white/[0.06]",
            ].join(" ")}
          >
            <SlidersHorizontal size={13} /> Filter
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] bg-white/[0.03] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.06] transition-colors"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="mb-4 relative max-w-md animate-in">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, brand, category, GTIN…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
        </div>
      )}

      {toast && (
        <div className={[
          "mb-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
          toast.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400",
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/[0.08] bg-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[36px_minmax(0,2.4fr)_120px_minmax(0,1fr)_110px_72px] gap-4 px-5 py-3 border-b border-border/[0.08] bg-white/[0.015]">
          <div className="flex items-center">
            <Checkbox checked={allChecked} onChange={toggleAll} />
          </div>
          {["Product", "Status", "Category", "Price", "Health"].map((h, i) => (
            <div key={h} className={[
              "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55",
              i === 3 ? "text-right" : i === 4 ? "text-center" : "",
            ].join(" ")}>{h}</div>
          ))}
        </div>

        {busy && products.length === 0 ? (
          <div className="p-12 flex items-center justify-center gap-2 text-muted-foreground/60">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading catalog…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-serif text-lg font-semibold text-foreground/80">
              {products.length === 0 ? "No canonical products yet" : "Nothing matches this view"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length === 0
                ? "Approved link, CSV, and connector ingestions will appear here."
                : "Try a different tab or clear the search."}
            </p>
          </div>
        ) : (
          filtered.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              health={healthOf.get(p.id) ?? 0}
              checked={checked.has(p.id)}
              onToggle={() => toggleOne(p.id)}
              onClick={() => setSelectedId(p.id)}
            />
          ))
        )}
      </div>

      {nextCursor && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-sm text-foreground/80 hover:bg-white/[0.07] disabled:opacity-40 flex items-center gap-2"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {/* Sticky summary footer */}
      <div className="fixed bottom-0 left-[var(--sidebar-width,256px)] right-0 z-10 border-t border-border/[0.08] bg-background/80 backdrop-blur-md">
        <div className="px-8 py-3 flex items-center gap-8 text-xs">
          <FooterStat label="Catalog Health" value={`${counts.avgHealth}%`} tone={counts.avgHealth >= 80 ? "emerald" : counts.avgHealth >= 50 ? "amber" : "rose"} />
          <FooterStat label="Needs Enrichment" value={counts.needs} tone={counts.needs ? "amber" : "muted"} />
          <FooterStat label="Uncategorised" value={counts.uncategorised} tone={counts.uncategorised ? "rose" : "muted"} />
          <FooterStat label="Total SKUs" value={counts.total} tone="default" />
          <button
            onClick={() => void loadProducts()}
            disabled={busy}
            className="ml-auto flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] bg-white/[0.04] border border-border/[0.08] text-foreground/75 hover:bg-white/[0.07] disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
          </button>
        </div>
      </div>

      {selectedId && (
        <ProductDetailModal
          productId={selectedId}
          onClose={handleClose}
          onDelete={async (id) => {
            try {
              await api.catalog.delete(id);
              setProducts((ps) => ps.filter((p) => p.id !== id));
              setSelectedId(null);
              showToast({ type: "success", message: "Product deleted." });
            } catch (e) {
              showToast({ type: "error", message: (e as Error).message });
            }
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      aria-label="Select"
      className={[
        "size-4 rounded-[5px] border flex items-center justify-center transition-colors",
        checked ? "bg-primary border-primary text-background" : "border-border/40 hover:border-foreground/40",
      ].join(" ")}
    >
      {checked && <CheckCircle2 size={11} strokeWidth={3} />}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
    draft: { label: "Draft", cls: "bg-amber-500/12 text-amber-300 border-amber-500/25" },
    archived: { label: "Archived", cls: "bg-rose-500/12 text-rose-300 border-rose-500/25" },
  };
  const s = map[status] ?? { label: status, cls: "bg-white/[0.05] text-foreground/60 border-border/20" };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${s.cls}`}>
      {s.label}
    </span>
  );
}

function HealthRing({ value }: { value: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#fb7185"; // emerald / amber / rose
  return (
    <div className="relative size-9">
      <svg viewBox="0 0 32 32" className="size-full -rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/[0.07]" />
        <circle
          cx="16" cy="16" r={r} fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums"
        style={{ color: tone }}
      >{pct}</span>
    </div>
  );
}

function ProductRow({
  product, health, checked, onToggle, onClick,
}: {
  product: ListCatalogProductRow;
  health: number;
  checked: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const price = getDisplayPrice(product);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      className={[
        "grid grid-cols-[36px_minmax(0,2.4fr)_120px_minmax(0,1fr)_110px_72px] gap-4 px-5 py-3.5 items-center cursor-pointer",
        "border-t border-border/[0.05] hover:bg-white/[0.025] transition-colors group",
        checked ? "bg-primary/[0.04]" : "",
      ].join(" ")}
    >
      <div className="flex items-center">
        <Checkbox checked={checked} onChange={onToggle} />
      </div>

      {/* Product */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-lg bg-white/[0.04] border border-border/[0.06] overflow-hidden flex items-center justify-center shrink-0">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URLs
            <img src={product.imageUrl} alt="" className="size-full object-cover" loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <Package size={17} className="text-muted-foreground/30" strokeWidth={1.3} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground/95 truncate group-hover:text-primary transition-colors">
            {product.title ?? <span className="text-muted-foreground/50 italic">Untitled</span>}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/45 truncate">
            {product.brand ? `${product.brand} · ` : ""}{product.gtin ?? product.id.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* Status */}
      <div><StatusBadge status={product.status} /></div>

      {/* Category */}
      <div className="min-w-0 text-sm text-foreground/75 truncate">
        {product.category ?? <span className="text-muted-foreground/35">—</span>}
      </div>

      {/* Price */}
      <div className="text-right text-sm font-bold tabular-nums text-foreground/90">
        {price?.text ?? <span className="font-normal text-muted-foreground/35">—</span>}
      </div>

      {/* Health */}
      <div className="flex justify-center"><HealthRing value={health} /></div>
    </div>
  );
}

function FooterStat({
  label, value, tone,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "amber" | "rose" | "muted" | "default";
}) {
  const cls = {
    emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300",
    muted: "text-muted-foreground/50", default: "text-foreground/90",
  }[tone];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
