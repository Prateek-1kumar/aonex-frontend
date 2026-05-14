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
  ChevronRight,
} from "lucide-react";
import { api, type CatalogProduct } from "@/lib/api";
import { ProductDetailModal } from "./components/ProductDetailModal";

type Toast = { type: "success" | "error"; message: string } | null;
type StatusFilter = "all" | "active" | "draft";

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [deleting, setDeleting] = useState(false);
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

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      await api.deleteCatalogProduct(selected.id);
      // Remove from local list so it disappears immediately.
      setProducts((ps) => ps.filter((p) => p.id !== selected.id));
      setSelected(null);
      showToast({ type: "success", message: "Product deleted." });
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setDeleting(false);
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
    const skus = products.reduce((acc, p) => acc + p.variants.length, 0);
    return { total: products.length, active, draft, skus };
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

      <div className="mb-5 grid grid-cols-3 gap-3">
        <SummaryCard label="Products" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} tone="emerald" />
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
          {(["all", "active", "draft"] as StatusFilter[]).map((s) => (
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
        <div className="rounded-xl border border-border/[0.08] bg-card overflow-hidden">
          {filtered.map((product, idx) => (
            <ProductRow
              key={product.id}
              product={product}
              first={idx === 0}
              onClick={() => setSelected(product)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ProductDetailModal
          product={selected}
          busy={deleting}
          onDelete={handleDelete}
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

function ProductRow({
  product,
  first,
  onClick,
}: {
  product: CatalogProduct;
  first: boolean;
  onClick: () => void;
}) {
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
      className={[
        "w-full text-left grid grid-cols-[64px_minmax(0,1fr)_auto_auto_18px] gap-5 px-5 py-4 items-center group hover:bg-white/[0.02] transition-colors focus:outline-none focus:bg-white/[0.03]",
        first ? "" : "border-t border-border/[0.06]",
      ].join(" ")}
    >
      <div className="size-16 rounded-lg bg-white/[0.04] border border-border/[0.06] overflow-hidden flex items-center justify-center shrink-0">
        {v?.images?.[0]?.url ? (
          <img src={v.images[0].url} alt={v.title} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={20} className="text-muted-foreground/40" strokeWidth={1.2} />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground/95 truncate">
            {v?.title ?? "Untitled product"}
          </p>
          <span
            className={`shrink-0 px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider border ${statusTone}`}
          >
            {product.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/65 truncate">
          {[v?.brand, product.canonicalCategory].filter(Boolean).join(" · ") || "Canonical product"}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground/45">
          <span>v{v?.id?.slice(0, 8) ?? "draft"}</span>
          <span className="flex items-center gap-1">
            <Tag size={10} />
            {product.variants.length} SKU{product.variants.length === 1 ? "" : "s"}
          </span>
          {v?.gtin && <span className="font-mono normal-case tracking-normal">GTIN {v.gtin}</span>}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums text-foreground/90">{price ?? "—"}</p>
        <p className={`mt-0.5 text-[10px] font-bold tabular-nums ${confTone}`}>
          {confidence.toFixed(0)}% confident
        </p>
      </div>

      <div className="text-right shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/45 hidden md:block">
        Updated
        <br />
        <span className="text-muted-foreground/65 normal-case tracking-normal">
          {new Date(product.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <ChevronRight
        size={16}
        className="text-muted-foreground/35 group-hover:text-foreground/70 transition-colors"
      />
    </button>
  );
}
