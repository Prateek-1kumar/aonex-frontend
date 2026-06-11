"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Tag, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { UncategorizedItem } from "@/lib/api";
import CategoryBreadcrumb from "@/components/category-breadcrumb";
import { CategorizeModal } from "./CategorizeModal";

type Toast = { type: "success" | "error"; message: string } | null;

interface CategorizePanelProps {
  /** Lifted toast handler so the parent can share the single toast slot */
  onToast: (t: Toast) => void;
}

export function CategorizePanel({ onToast }: CategorizePanelProps) {
  const [items, setItems] = useState<UncategorizedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<UncategorizedItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: fetched } = await api.lab.taxonomyUncategorized();
      setItems(fetched);
    } catch (e) {
      onToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const categorize = useCallback(
    async (item: UncategorizedItem, nodeId: string) => {
      setBusyId(item.productId);
      try {
        const result = await api.lab.categorize(item.productId, nodeId, item.sourceCategory);
        setItems((prev) => prev.filter((i) => i.productId !== item.productId));
        setActiveItem(null);
        onToast({
          type: "success",
          message: result.learned
            ? `Categorized · learned "${item.sourceCategory}" for next time`
            : "Categorized · taxonomy node assigned",
        });
      } catch (e) {
        onToast({ type: "error", message: (e as Error).message });
      } finally {
        setBusyId(null);
      }
    },
    [onToast]
  );

  // Only the INITIAL load blanks the panel. A refresh keeps the list mounted so
  // the page height (and scroll position) never collapses underneath the user.
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={26} className="animate-spin text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Loading uncategorized products…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/[0.08] bg-card py-24 text-center shadow-sm">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--success)/0.5),transparent_70%)] opacity-60 blur-lg" />
          <div className="relative grid size-14 place-items-center rounded-2xl border border-success/25 bg-success/10 text-success">
            <CheckCircle2 size={26} strokeWidth={1.6} />
          </div>
        </div>
        <p className="font-serif text-lg font-semibold text-foreground/80">
          All caught up — nothing to categorize
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Products auto-categorize on ingest. Anything the classifier isn&apos;t confident
          about lands here for a quick manual pick.
        </p>
        <button
          onClick={() => void load()}
          className="mt-5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-sm text-foreground/70 hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-muted-foreground/70">
          <p>
            <span className="font-semibold text-foreground/80">{items.length}</span>{" "}
            product{items.length === 1 ? "" : "s"} need a manual category
          </p>
          <p className="mt-0.5 text-muted-foreground/45">
            Products auto-categorize on ingest — these are the ones the classifier
            wasn&apos;t confident about.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover hover:text-foreground disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {/* Compact rows — dense + scannable. The picker opens in a modal so its
          results can never be clipped by the row below. */}
      <div className="rounded-2xl border border-border/[0.08] bg-card shadow-sm overflow-hidden divide-y divide-border/[0.05]">
        {items.map((item) => {
          const top = item.suggestions[0];
          const topPct = top ? Math.round(top.score * 100) : 0;
          const busy = busyId === item.productId;
          return (
            <div
              key={item.productId}
              className={[
                "flex items-center gap-3 px-4 py-3 transition-colors",
                busy ? "opacity-60 pointer-events-none" : "hover:bg-surface-hover",
              ].join(" ")}
            >
              <div className="shrink-0 grid size-9 place-items-center rounded-lg border border-border/[0.07] bg-surface text-muted-foreground/40">
                <Tag size={15} strokeWidth={1.4} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/95 truncate">
                  {item.title || <span className="italic text-muted-foreground/50">Untitled product</span>}
                </p>
                {item.sourceCategory && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground/50 truncate">
                    source: <span className="text-muted-foreground/75">{item.sourceCategory}</span>
                  </p>
                )}
              </div>

              {/* High-confidence top suggestion → one-click apply */}
              {top && topPct >= 60 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void categorize(item, top.nodeId)}
                  title={`Apply: ${top.displayPath}`}
                  className="hidden lg:flex shrink-0 max-w-[16rem] items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-success/25 bg-success/[0.07] text-success hover:bg-success/15 transition-colors"
                >
                  <CategoryBreadcrumb displayPath={top.displayPath} className="text-[11px] leading-none" />
                  <span className="shrink-0 text-[10px] font-bold tabular-nums">{topPct}%</span>
                </button>
              )}

              {/* Open the full picker */}
              <button
                type="button"
                disabled={busy}
                onClick={() => setActiveItem(item)}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : "Categorize"}
                {!busy && <ChevronRight size={13} />}
              </button>
            </div>
          );
        })}
      </div>

      {activeItem && (
        <CategorizeModal
          item={activeItem}
          busy={busyId === activeItem.productId}
          onPick={(nodeId) => void categorize(activeItem, nodeId)}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
