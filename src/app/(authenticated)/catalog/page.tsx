"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  ImageOff,
} from "lucide-react";
import { api, type CatalogProduct } from "@/lib/api";
import { ProductDetailModal } from "./components/ProductDetailModal";

type Toast = { type: "success" | "error"; message: string } | null;
type StatusFilter = "all" | "active" | "draft" | "archived";

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    setBusy(true);
    try {
      const res = await api.listCatalogProducts();
      setProducts(res.products);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleArchive() {
    if (!selected) return;
    setArchiving(true);
    try {
      await api.archiveCatalogProduct(selected.id);
      setProducts((ps) =>
        ps.map((p) => (p.id === selected.id ? { ...p, status: "archived" } : p))
      );
      setSelected(null);
      showToast({ type: "success", message: "Product archived." });
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setArchiving(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!term) return true;
      const v = p.current_version;
      const haystack = [v?.title, v?.brand, v?.gtin, v?.modelNumber, p.canonicalCategory]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [products, search, statusFilter]);

  const summary = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    const draft = products.filter((p) => p.status === "draft").length;
    const archived = products.filter((p) => p.status === "archived").length;
    const skus = products.reduce((acc, p) => acc + p.variants.length, 0);
    return { total: products.length, active, draft, archived, skus };
  }, [products]);

  return (
    <div className="animate-in max-w-8xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground">Catalog</h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Canonical System Truth
          </p>
        </div>
        <button
          onClick={() => void loadProducts()}
          disabled={busy}
          className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center disabled:opacity-40"
          aria-label="Refresh catalog"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Products" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} tone="emerald" />
        <SummaryCard label="Archived" value={summary.archived} tone="muted" />
        <SummaryCard label="SKUs" value={summary.skus} />
      </div>

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, brand, GTIN, model…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-border/[0.06]">
          {(["all", "active", "draft", "archived"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                "px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider",
                statusFilter === s
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground/60 hover:text-foreground/80",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div
          className={[
            "mb-5 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
            toast.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400",
          ].join(" ")}
        >
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {!busy && filtered.length === 0 ? (
        <div className="rounded-xl border border-border/[0.08] bg-card p-10 text-center">
          <p className="font-serif text-lg font-semibold text-foreground/80">
            {products.length === 0 ? "No canonical products yet" : "No products match this filter"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length === 0
              ? "Approved link, CSV, and connector ingestions will appear here."
              : "Try clearing the search or switching filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onClick={() => setSelected(product)} />
          ))}
        </div>
      )}

      {selected && (
        <ProductDetailModal
          product={selected}
          busy={archiving}
          onArchive={handleArchive}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "muted" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-300" : tone === "muted" ? "text-muted-foreground/60" : "text-foreground/90";
  return (
    <div className="rounded-xl border border-border/[0.06] bg-card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function ProductCard({ product, onClick }: { product: CatalogProduct; onClick: () => void }) {
  const v = product.current_version;
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

  const confTone =
    confidence >= 90 ? "text-emerald-300" : confidence >= 60 ? "text-amber-300" : "text-red-300";

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border/[0.07] bg-card hover:border-border/[0.15] hover:bg-white/[0.02] transition-all duration-150 overflow-hidden group focus:outline-none focus:border-primary/30"
    >
      <div className="aspect-[16/10] bg-white/[0.04] border-b border-border/[0.06] overflow-hidden flex items-center justify-center relative">
        {v?.images?.[0]?.url ? (
          <img
            src={v.images[0].url}
            alt={v.title}
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <ImageOff size={28} className="text-muted-foreground/40" strokeWidth={1.2} />
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${statusTone}`}
        >
          {product.status}
        </span>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 truncate">
          {[v?.brand, product.canonicalCategory].filter(Boolean).join(" · ") || "Canonical product"}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground/95 leading-snug line-clamp-2 min-h-[2.5rem]">
          {v?.title ?? "Untitled product"}
        </h3>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-base font-bold tabular-nums text-foreground/90">{price ?? "—"}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
              <Tag size={11} />
              {product.variants.length} variant{product.variants.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xs font-bold tabular-nums ${confTone}`}>{confidence.toFixed(0)}%</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">confidence</p>
          </div>
        </div>
      </div>
    </button>
  );
}
