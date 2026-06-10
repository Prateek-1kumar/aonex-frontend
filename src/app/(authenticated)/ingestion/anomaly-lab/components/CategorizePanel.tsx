"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Tag,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { UncategorizedItem, TaxonomyNodeHit } from "@/lib/api";
import CategoryBreadcrumb from "@/components/category-breadcrumb";
import { TaxonomyPicker } from "./TaxonomyPicker";

// ── Types ──────────────────────────────────────────────────────────────────────

type Toast = { type: "success" | "error"; message: string } | null;

interface CategorizePanelProps {
  /** Lifted toast handler so the parent can share the single toast slot */
  onToast: (t: Toast) => void;
}

// ── CategorizePanel ────────────────────────────────────────────────────────────

export function CategorizePanel({ onToast }: CategorizePanelProps) {
  const [items, setItems] = useState<UncategorizedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function categorize(item: UncategorizedItem, nodeId: string) {
    setBusyId(item.productId);
    try {
      const result = await api.lab.categorize(item.productId, nodeId, item.sourceCategory);
      // Optimistic remove
      setItems((prev) => prev.filter((i) => i.productId !== item.productId));
      onToast({
        type: "success",
        message: result.learned
          ? `Categorized · learned this label for "${item.sourceCategory}"`
          : `Categorized · taxonomy node assigned`,
      });
    } catch (e) {
      onToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={26} className="animate-spin text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Loading uncategorized products…</p>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
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
          All clear — every product is categorized
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          New uncategorized products appear here after ingestion.
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

  // ── Product list ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Refresh control */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground/70">
          <span className="font-semibold text-foreground/80">{items.length}</span>{" "}
          product{items.length === 1 ? "" : "s"} need a taxonomy assignment
        </p>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover hover:text-foreground disabled:opacity-40 transition-colors"
          aria-label="Refresh uncategorized list"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <UncategorizedCard
            key={item.productId}
            item={item}
            busy={busyId === item.productId}
            onCategorize={(nodeId) => void categorize(item, nodeId)}
          />
        ))}
      </div>
    </div>
  );
}

// ── UncategorizedCard ─────────────────────────────────────────────────────────

interface UncategorizedCardProps {
  item: UncategorizedItem;
  busy: boolean;
  onCategorize: (nodeId: string) => void;
}

function UncategorizedCard({ item, busy, onCategorize }: UncategorizedCardProps) {
  const [pickerSelected, setPickerSelected] = useState<TaxonomyNodeHit | null>(null);

  // The classifier prepends its top pick to its own alternatives, so the same
  // node can appear twice — dedupe (keeping the highest-scoring first hit) to
  // keep React keys unique and avoid showing a category chip twice.
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    return item.suggestions.filter((s) => (seen.has(s.nodeId) ? false : (seen.add(s.nodeId), true)));
  }, [item.suggestions]);

  function handlePickerSelect(node: TaxonomyNodeHit) {
    setPickerSelected(node);
  }

  function confirmPickerSelection() {
    if (!pickerSelected) return;
    onCategorize(pickerSelected.nodeId);
    setPickerSelected(null);
  }

  return (
    <div
      className={[
        "rounded-2xl border border-border/[0.08] bg-card shadow-sm overflow-hidden transition-opacity",
        busy ? "opacity-60 pointer-events-none" : "",
      ].join(" ")}
    >
      {/* Card header */}
      <div className="px-5 py-4 flex items-start gap-3 border-b border-border/[0.05]">
        <div className="shrink-0 grid size-9 place-items-center rounded-lg border border-border/[0.08] bg-surface text-muted-foreground/40">
          <Tag size={16} strokeWidth={1.4} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground/95 leading-snug">
            {item.title || <span className="italic text-muted-foreground/50">Untitled product</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/55">
            source:{" "}
            <span className="font-medium text-muted-foreground/80">{item.sourceCategory}</span>
          </p>
        </div>

        {busy && (
          <Loader2 size={16} className="animate-spin shrink-0 text-muted-foreground/50 mt-0.5" />
        )}
      </div>

      {/* Suggestions */}
      <div className="px-5 py-4 space-y-3">
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
              <Sparkles size={10} className="text-primary/70" />
              Classifier suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => {
                const pct = Math.round(s.score * 100);
                // Confidence tier drives the chip appearance
                const isHigh = s.score >= 0.75;
                const isMid = s.score >= 0.5 && s.score < 0.75;

                return (
                  <button
                    key={s.nodeId}
                    type="button"
                    onClick={() => onCategorize(s.nodeId)}
                    disabled={busy}
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                      "hover:ring-2 hover:ring-ring/30 active:scale-[0.97]",
                      isHigh
                        ? "border-success/30 bg-success/10 text-success hover:bg-success/15"
                        : isMid
                        ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                        : "border-border/[0.15] bg-surface text-foreground/70 hover:bg-surface-hover",
                    ].join(" ")}
                    title={`Assign: ${s.displayPath}`}
                  >
                    <CategoryBreadcrumb
                      displayPath={s.displayPath}
                      className="text-[11px] leading-none"
                    />
                    <span
                      className={[
                        "shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                        isHigh
                          ? "bg-success/20 text-success"
                          : isMid
                          ? "bg-primary/20 text-primary"
                          : "bg-surface-hover text-muted-foreground/70",
                      ].join(" ")}
                    >
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Constrained typeahead picker */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
            Search taxonomy
          </p>

          <TaxonomyPicker
            onSelect={handlePickerSelect}
            disabled={busy}
          />

          {/* Confirm button — only enabled when a node is selected from results */}
          {pickerSelected && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                  Selected
                </p>
                <CategoryBreadcrumb
                  displayPath={pickerSelected.displayPath}
                  className="text-xs mt-0.5"
                />
              </div>
              <button
                type="button"
                onClick={confirmPickerSelection}
                disabled={busy}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-primary to-primary/85 text-primary-foreground text-xs font-semibold shadow shadow-primary/20 hover:brightness-110 active:translate-y-px transition-all disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
