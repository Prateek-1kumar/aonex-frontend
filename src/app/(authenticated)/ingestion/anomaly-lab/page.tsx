"use client";

import { useEffect, useCallback, useMemo, useState, Suspense } from "react";
import {
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Search, Package, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { QueueItem, QueueStats } from "./lib/lab-types";
import { QueueStatsHeader } from "./components/QueueStatsHeader";
import { PushToCatalogModal } from "./components/PushToCatalogModal";
import { useRouter, useSearchParams } from "next/navigation";

type Toast = { type: "success" | "error"; message: string } | null;

function AnomalyLabPageContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const router = useRouter();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // First page (100 max) + the real total from stats, then stream the rest
      // so the whole queue is listed rather than capped at one page.
      const [first, s] = await Promise.all([api.lab.queue(100), api.lab.stats()]);
      setStats(s);
      setQueue(first.items);
      setLoading(false);

      let cursor = first.nextCursor;
      let pages = 1;
      while (cursor && pages < 50) {
        const res = await api.lab.queue(100, cursor);
        // Dedupe against the current list (not a local set) so overlapping loads
        // — e.g. React StrictMode's double-invoke — can't produce duplicate keys.
        setQueue((prev) => {
          const have = new Set(prev.map((i) => i.stagedProductId));
          return [...prev, ...res.items.filter((i) => !have.has(i.stagedProductId))];
        });
        cursor = res.nextCursor;
        pages += 1;
      }
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Deep-link support: /ingestion/anomaly-lab?id=<stagedProductId> opens that SKU.
  useEffect(() => {
    if (idParam) setSelectedId(idParam);
  }, [idParam]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    if (idParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      router.replace(url.pathname + url.search);
    }
  }, [router, idParam]);

  const handleResolved = useCallback(
    (id: string, _kind: "approved" | "rejected" | "linked", message: string) => {
      setQueue((prev) => prev.filter((i) => i.stagedProductId !== id));
      setSelectedId(null);
      if (idParam === id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("id");
        router.replace(url.pathname + url.search);
      }
      showToast({ type: "success", message });
      // Refresh the breakdown chips in the background — non-blocking.
      api.lab.stats().then(setStats).catch(() => {});
    },
    [idParam, router]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return queue;
    return queue.filter((i) =>
      [i.denormTitle, i.denormBrand, i.sourceKind, i.stagedProductId]
        .filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [queue, search]);

  const selectedItem = useMemo(
    () => queue.find((i) => i.stagedProductId === selectedId) ?? null,
    [queue, selectedId]
  );

  return (
    <div className="animate-in flex flex-col gap-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground">Anomaly Lab</h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Review &amp; push to catalog
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="size-9 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover flex items-center justify-center disabled:opacity-40"
          aria-label="Refresh queue"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>

      {/* Summary */}
      <QueueStatsHeader stats={stats} count={stats?.total ?? queue.length} />

      {/* Toast */}
      {toast && (
        <div className={[
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm border bg-card",
          toast.type === "success" ? "border-success/20 text-success" : "border-danger/20 text-danger",
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Search */}
      {queue.length > 0 && (
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, brand, source…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-border/[0.08] text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
        </div>
      )}

      {/* List */}
      {loading && queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={26} className="animate-spin text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Loading queue…</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 size={40} className="text-success mb-4" strokeWidth={1.5} />
          <p className="font-serif text-lg font-semibold text-foreground/80">All clear — nothing staged</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New items appear here when ingestion needs your review before publishing.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/[0.08] bg-card p-12 text-center">
          <p className="font-serif text-lg font-semibold text-foreground/80">Nothing matches “{search}”.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/[0.08] bg-card overflow-hidden">
          {filtered.map((item) => (
            <QueueRow
              key={item.stagedProductId}
              item={item}
              onClick={() => setSelectedId(item.stagedProductId)}
            />
          ))}
        </div>
      )}

      {/* Review modal */}
      {selectedId && selectedItem && (
        <PushToCatalogModal
          item={selectedItem}
          onClose={handleClose}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function QueueRow({ item, onClick }: { item: QueueItem; onClick: () => void }) {
  const missing = item.missingFields.length;
  const price = formatPrice(item.denormPrice, item.denormCurrency);

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 px-5 py-4 border-t border-border/[0.04] first:border-t-0 hover:bg-surface-hover transition-colors group"
    >
      <div className="size-10 rounded-lg bg-surface border border-border/[0.06] flex items-center justify-center shrink-0">
        <Package size={17} className="text-muted-foreground/35" strokeWidth={1.3} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground/95 truncate group-hover:text-primary transition-colors">
          {item.denormTitle ?? <span className="text-muted-foreground/50 italic">Untitled product</span>}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/60 flex-wrap">
          {item.denormBrand && <span className="text-foreground/70 font-medium">{item.denormBrand}</span>}
          {item.denormBrand && <span>·</span>}
          <span className="capitalize">{item.sourceKind}</span>
          <span>·</span>
          <span>{formatRelativeTime(item.createdAt)}</span>
        </div>
      </div>

      {price && (
        <div className="text-sm font-bold tabular-nums text-foreground/90 shrink-0">{price}</div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {item.candidateCount > 0 && (
          <span className="hidden sm:inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {item.candidateCount} match{item.candidateCount === 1 ? "" : "es"}
          </span>
        )}
        {missing > 0 ? (
          <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
            {missing} to complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success">
            <CheckCircle2 size={10} /> Ready
          </span>
        )}
        <ChevronRight size={15} className="text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
      </div>
    </button>
  );
}

export default function AnomalyLabPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={28} className="animate-spin text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      </div>
    }>
      <AnomalyLabPageContent />
    </Suspense>
  );
}
