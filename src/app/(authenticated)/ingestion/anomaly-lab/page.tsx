"use client";

import { useEffect, useCallback, useMemo, useState, Suspense } from "react";
import {
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Search, Package, ChevronRight,
  FlaskConical, AlertTriangle, Tag,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { QueueItem, QueueStats } from "./lib/lab-types";
import { QueueStatsHeader } from "./components/QueueStatsHeader";
import { PushToCatalogModal } from "./components/PushToCatalogModal";
import { CategorizePanel } from "./components/CategorizePanel";
import { PageHero, StatCard } from "@/components/ui/page-chrome";
import { useRouter, useSearchParams } from "next/navigation";

type Toast = { type: "success" | "error"; message: string } | null;
type LabTab = "queue" | "categorize";

function AnomalyLabPageContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<LabTab>("queue");

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Uncategorized count shown in the Categorize tab badge — fetched lazily
  const [uncategorizedCount, setUncategorizedCount] = useState<number | null>(null);

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

  // Fetch uncategorized count once on mount so the tab badge is populated.
  useEffect(() => {
    api.lab.taxonomyUncategorized()
      .then(({ items }) => setUncategorizedCount(items.length))
      .catch(() => {});
  }, []);

  // Deep-link support: /ingestion/anomaly-lab?id=<stagedProductId> opens that SKU.
  useEffect(() => {
    if (idParam) setSelectedId(idParam);
  }, [idParam]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    if (idParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [router, idParam]);

  const handleResolved = useCallback(
    (id: string, _kind: "approved" | "rejected" | "linked", message: string) => {
      setQueue((prev) => prev.filter((i) => i.stagedProductId !== id));
      setSelectedId(null);
      if (idParam === id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("id");
        router.replace(url.pathname + url.search, { scroll: false });
      }
      showToast({ type: "success", message });
      // Refresh the breakdown chips in the background — non-blocking.
      api.lab.stats().then(setStats).catch(() => {});
    },
    [idParam, router]
  );

  // Stable handler for the Categorize panel. An inline arrow here would get a
  // new identity on every parent render (e.g. each toast), re-firing the panel's
  // load effect and snapping scroll to the top. References only stable setters.
  const handleCategorizeToast = useCallback((t: Toast) => {
    setToast(t);
    if (t !== null) setTimeout(() => setToast(null), 3500);
    if (t?.type === "success") {
      api.lab
        .taxonomyUncategorized()
        .then(({ items }) => setUncategorizedCount(items.length))
        .catch(() => {});
    }
  }, []);

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

  const kpis = useMemo(() => {
    let ready = 0, needsInfo = 0;
    for (const i of queue) {
      if (i.missingFields.length === 0) ready += 1; else needsInfo += 1;
    }
    return { awaiting: stats?.total ?? queue.length, ready, needsInfo };
  }, [queue, stats]);

  return (
    <div className="animate-in flex flex-col gap-4 pb-10">
      {/* Header */}
      <PageHero
        icon={<FlaskConical size={22} strokeWidth={1.6} />}
        eyebrow="Ingestion"
        title="Anomaly Lab"
        description="Inspect staged products that need a human check, complete what's missing, then push them to the catalog or assign taxonomy categories."
        actions={
          activeTab === "queue" ? (
            <button
              onClick={() => void load()}
              disabled={loading}
              className="size-9 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover hover:text-foreground flex items-center justify-center disabled:opacity-40 transition-colors"
              aria-label="Refresh queue"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            </button>
          ) : null
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Package size={16} />} label="Awaiting" value={kpis.awaiting} tone="primary" />
          <StatCard icon={<CheckCircle2 size={16} />} label="Ready" value={kpis.ready} tone="success" />
          <StatCard icon={<AlertTriangle size={16} />} label="Needs Info" value={kpis.needsInfo} tone="warning" />
          <StatCard
            icon={<Tag size={16} />}
            label="Uncategorized"
            value={uncategorizedCount ?? "—"}
            tone={uncategorizedCount && uncategorizedCount > 0 ? "warning" : "muted"}
          />
        </div>
      </PageHero>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-border/[0.08] bg-card p-1 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("queue")}
          className={[
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
            activeTab === "queue"
              ? "bg-surface shadow-sm text-foreground border border-border/[0.08]"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
          ].join(" ")}
        >
          <Package size={14} />
          Review Queue
          {kpis.awaiting > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold w-4 h-4 tabular-nums">
              {kpis.awaiting > 99 ? "99+" : kpis.awaiting}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("categorize")}
          className={[
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
            activeTab === "categorize"
              ? "bg-surface shadow-sm text-foreground border border-border/[0.08]"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
          ].join(" ")}
        >
          <Tag size={14} />
          Categorize
          {uncategorizedCount !== null && uncategorizedCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-warning/15 text-warning text-[10px] font-bold w-4 h-4 tabular-nums">
              {uncategorizedCount > 99 ? "99+" : uncategorizedCount}
            </span>
          )}
        </button>
      </div>

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

      {/* ── Review Queue tab ────────────────────────────────────────────────── */}
      {activeTab === "queue" && (
        <>
          {/* Summary */}
          <QueueStatsHeader stats={stats} count={stats?.total ?? queue.length} />

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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/[0.08] bg-card py-24 text-center shadow-sm">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--success)/0.5),transparent_70%)] opacity-60 blur-lg" />
                <div className="relative grid size-14 place-items-center rounded-2xl border border-success/25 bg-success/10 text-success">
                  <CheckCircle2 size={26} strokeWidth={1.6} />
                </div>
              </div>
              <p className="font-serif text-lg font-semibold text-foreground/80">All clear — nothing staged</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New items appear here when ingestion needs your review before publishing.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/[0.08] bg-card p-12 text-center shadow-sm">
              <p className="font-serif text-lg font-semibold text-foreground/80">Nothing matches &ldquo;{search}&rdquo;.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/[0.08] bg-card overflow-hidden shadow-sm">
              {filtered.map((item) => (
                <QueueRow
                  key={item.stagedProductId}
                  item={item}
                  onClick={() => setSelectedId(item.stagedProductId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Categorize tab ───────────────────────────────────────────────────── */}
      {activeTab === "categorize" && (
        <CategorizePanel onToast={handleCategorizeToast} />
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
