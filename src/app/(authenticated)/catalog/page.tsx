"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Package,
  Boxes,
} from "lucide-react";
import { api } from "@/lib/api";
import type { TaxonomyTreeNode } from "@/lib/api";
import type { ListCatalogProductRow } from "./lib/catalog-types";
import { ProductDetailModal } from "./components/ProductDetailModal";
import ProductCard from "./components/ProductCard";
import CategoryTree from "@/components/category-tree";
import CategoryBreadcrumb from "@/components/category-breadcrumb";
import { PageHero } from "@/components/ui/page-chrome";
import { useRouter, useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Toast = { type: "success" | "error"; message: string } | null;

// ── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 60;

// ── Main page content ────────────────────────────────────────────────────────

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const router = useRouter();

  // ── Deep-link: open modal when ?id= is present ─────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(idParam ?? null);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    router.replace(url.pathname + url.search);
  }, [router]);

  useEffect(() => {
    if (idParam) setSelectedId(idParam);
  }, [idParam]);

  // ── Toast ──────────────────────────────────────────────────────────────────

  const [toast, setToast] = useState<Toast>(null);
  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Taxonomy tree ──────────────────────────────────────────────────────────

  const [treeNodes, setTreeNodes] = useState<TaxonomyTreeNode[] | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [treeError, setTreeError] = useState<string | null>(null);

  useEffect(() => {
    api.catalog
      .taxonomyTree()
      .then(({ nodes, uncategorizedCount: uc }) => {
        setTreeNodes(nodes);
        setUncategorizedCount(uc);
      })
      .catch((e: Error) => {
        setTreeError(e.message);
        // Still render an empty tree so the rest of the page works
        setTreeNodes([]);
      });
  }, []);

  // ── Filter state ───────────────────────────────────────────────────────────

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [uncategorizedSelected, setUncategorizedSelected] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  // Debounced search value that drives the API call
  const [q, setQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQ(value);
    }, 300);
  }

  function handleSelectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
    setUncategorizedSelected(false);
  }

  function handleSelectUncategorized() {
    setUncategorizedSelected(true);
    setSelectedNodeId(null);
  }

  // ── Product list ───────────────────────────────────────────────────────────

  const [products, setProducts] = useState<ListCatalogProductRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Stable filter signature — if this changes, reset and re-fetch
  const filterKey = `${selectedNodeId ?? ""}|${uncategorizedSelected}|${q.trim()}`;
  const filterKeyRef = useRef(filterKey);

  async function fetchPage1(key: string) {
    setBusy(true);
    setProducts([]);
    setNextCursor(null);
    setTotal(null);
    try {
      const res = await api.catalog.list({
        limit: PAGE_SIZE,
        ...(selectedNodeId ? { category: selectedNodeId } : {}),
        ...(uncategorizedSelected ? { uncategorized: true } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      });
      // Guard against a stale call from a previous filter
      if (filterKeyRef.current !== key) return;
      setProducts(res.products);
      setNextCursor(res.nextCursor);
      setTotal(res.total);
    } catch (e) {
      if (filterKeyRef.current !== key) return;
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      if (filterKeyRef.current === key) setBusy(false);
    }
  }

  useEffect(() => {
    filterKeyRef.current = filterKey;
    void fetchPage1(filterKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.catalog.list({
        limit: PAGE_SIZE,
        cursor: nextCursor,
        ...(selectedNodeId ? { category: selectedNodeId } : {}),
        ...(uncategorizedSelected ? { uncategorized: true } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      });
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

  function handleRefresh() {
    void fetchPage1(filterKey);
  }

  // ── Selected node display path (for breadcrumb) ────────────────────────────

  const displayPath =
    selectedNodeId && treeNodes
      ? (treeNodes.find((n) => n.nodeId === selectedNodeId)?.displayPath ?? "")
      : "";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in max-w-8xl pb-16">
      {/* Header */}
      <PageHero
        icon={<Boxes size={22} strokeWidth={1.6} />}
        eyebrow="Master Catalog"
        title="Master Catalog"
        description="Browse every approved product by category — search, filter, and open the detail drawer."
        actions={
          <button
            onClick={handleRefresh}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] bg-surface border border-border/[0.08] text-foreground/75 hover:bg-surface-hover disabled:opacity-40 transition-colors"
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Refresh
          </button>
        }
      />

      {/* Toast */}
      {toast && (
        <div
          className={[
            "mb-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
            toast.type === "success"
              ? "bg-success/10 border border-success/20 text-success"
              : "bg-danger/10 border border-danger/20 text-danger",
          ].join(" ")}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          {toast.message}
        </div>
      )}

      {/* Tree load error */}
      {treeError && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-warning/10 border border-warning/20 text-warning">
          <AlertCircle size={15} />
          Category tree unavailable: {treeError}
        </div>
      )}

      {/* Two-column layout — GRID (not flex): position:sticky on a flex child
          fails to pin in this app's scroll container, but works in a grid track
          (same pattern as the enrichment Review-Commit side panel). */}
      <div className="grid grid-cols-1 md:grid-cols-[14rem_minmax(0,1fr)] gap-6 items-start">
        {/* ── Left rail ────────────────────────────────────────────── */}
        {/* Sticky on the <aside>; the inner wrapper owns the scroll so overflow
            never sits on the sticky element itself. */}
        <aside className="hidden md:block self-start sticky top-4">
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin rounded-2xl border border-border/[0.08] bg-card shadow-sm p-3">
            {treeNodes === null ? (
              /* Tree loading placeholder */
              <div className="flex flex-col gap-1.5 py-2">
                {[100, 80, 90, 70, 85].map((w, i) => (
                  <div
                    key={i}
                    className="h-5 rounded-md bg-foreground/[0.05] animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : (
              <CategoryTree
                nodes={treeNodes}
                uncategorizedCount={uncategorizedCount}
                selectedNodeId={selectedNodeId}
                uncategorizedSelected={uncategorizedSelected}
                onSelect={handleSelectNode}
                onSelectUncategorized={handleSelectUncategorized}
              />
            )}
          </div>
        </aside>

        {/* ── Main area ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Search bar */}
          <div className="mb-4 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
            />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search title, brand, GTIN…"
              className="w-full max-w-md pl-9 pr-3 py-2 rounded-lg bg-surface border border-border/[0.08] text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Breadcrumb — only when a specific category is selected */}
          {displayPath && (
            <div className="mb-3 px-0.5">
              <CategoryBreadcrumb
                displayPath={displayPath}
                className="text-xs text-muted-foreground/70"
              />
            </div>
          )}
          {uncategorizedSelected && (
            <div className="mb-3 px-0.5">
              <span className="text-xs font-semibold text-warning">
                Uncategorized products
              </span>
            </div>
          )}

          {/* Status line */}
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground/60">
            {total !== null && (
              <span className="tabular-nums">
                {products.length} of {total.toLocaleString()} products
              </span>
            )}
            {busy && (
              <span className="flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Loading…
              </span>
            )}
          </div>

          {/* Grid / empty / loading */}
          {busy && products.length === 0 ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
            <EmptyState
              searchActive={q.trim().length > 0}
              uncategorized={uncategorizedSelected}
            />
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => setSelectedId(p.id)}
                  />
                ))}
              </div>

              {/* Load more */}
              {nextCursor && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="px-5 py-2 rounded-lg bg-surface border border-border/[0.08] text-sm text-foreground/80 hover:bg-surface-hover disabled:opacity-40 flex items-center gap-2 transition-colors"
                  >
                    {loadingMore ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product detail modal */}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function ProductGridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/[0.08] bg-card overflow-hidden shadow-sm"
        >
          <div className="aspect-square w-full bg-foreground/[0.05] animate-pulse" />
          <div className="p-3 flex flex-col gap-2">
            <div className="h-2.5 w-1/3 rounded bg-foreground/[0.05] animate-pulse" />
            <div className="h-3.5 w-full rounded bg-foreground/[0.05] animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-foreground/[0.05] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  searchActive,
  uncategorized,
}: {
  searchActive: boolean;
  uncategorized: boolean;
}) {
  const message = uncategorized
    ? "No uncategorized products"
    : searchActive
    ? "No products match your search"
    : "No products in this category";

  const sub = uncategorized
    ? "All products have a taxonomy assignment — great work."
    : searchActive
    ? "Try adjusting your search term or selecting a different category."
    : "Products will appear here once they are ingested and approved.";

  return (
    <div className="py-16 text-center">
      <div className="relative mx-auto mb-5 w-fit">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--primary)/0.4),transparent_70%)] opacity-50 blur-lg" />
        <div className="relative grid size-14 place-items-center rounded-2xl border border-border/[0.1] bg-surface text-muted-foreground/50">
          <Package size={26} strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-serif text-lg font-semibold text-foreground/80">
        {message}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

// ── Page export (Suspense boundary for useSearchParams) ───────────────────────

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground/60">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading catalog…</span>
        </div>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}
