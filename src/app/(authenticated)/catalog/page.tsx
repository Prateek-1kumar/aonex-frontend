"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { api, type CatalogProduct } from "@/lib/api";

type Toast = { type: "success" | "error"; message: string } | null;

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

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

  return (
    <div className="animate-in max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-4">
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
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>

      {toast && (
        <div className={[
          "mb-6 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
          toast.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400",
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {!busy && products.length === 0 ? (
        <div className="rounded-xl border border-border/[0.08] bg-card p-10 text-center">
          <p className="font-serif text-lg font-semibold text-foreground/80">No canonical products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Approved link, CSV, and connector ingestions will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/[0.08] bg-card overflow-hidden">
          {products.map((product, index) => {
            const version = product.current_version;
            return (
              <div
                key={product.id}
                className={[
                  "grid grid-cols-[64px_1fr_auto] gap-4 px-5 py-4 items-center",
                  index > 0 ? "border-t border-border/[0.06]" : "",
                ].join(" ")}
              >
                <div className="size-16 rounded-lg bg-white/[0.04] border border-border/[0.06] overflow-hidden flex items-center justify-center">
                  {version?.images?.[0]?.url ? (
                    <img src={version.images[0].url} alt={version.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">No img</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground/90 truncate">{version?.title ?? "Untitled product"}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60 truncate">
                    {[version?.brand, product.canonicalCategory].filter(Boolean).join(" · ") || "Canonical product"}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/40">
                    Version {version?.id?.slice(0, 8) ?? "draft"} · confidence {version ? (Number(version.confidenceScore) * 100).toFixed(0) : "0"}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground/90">
                    {version?.basePrice ? `${version.currency ?? ""} ${version.basePrice}` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/50 capitalize">{product.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
