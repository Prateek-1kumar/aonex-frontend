"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2, X, CornerDownLeft, Tag, Sparkles, Check } from "lucide-react";
import { api } from "@/lib/api";
import type { UncategorizedItem, TaxonomyNodeHit } from "@/lib/api";
import CategoryBreadcrumb from "@/components/category-breadcrumb";

interface Props {
  item: UncategorizedItem;
  busy: boolean;
  /** Confirm a taxonomy node for this product. */
  onPick: (nodeId: string) => void;
  onClose: () => void;
}

interface Option {
  nodeId: string;
  displayPath: string;
  /** Classifier confidence 0..1 — present only for suggestions. */
  score?: number;
}

/**
 * Focused, portaled category picker. Suggestions + live search live INSIDE the
 * modal body (a scrollable list, not an absolute dropdown), so results can
 * never be clipped by sibling cards. Keyboard: ↑/↓ to move, ↵ to pick, esc to
 * close.
 */
export function CategorizeModal({ item, busy, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaxonomyNodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The classifier prepends its top pick to its own alternatives — dedupe.
  const suggestions = useMemo<Option[]>(() => {
    const seen = new Set<string>();
    return item.suggestions
      .filter((s) => (seen.has(s.nodeId) ? false : (seen.add(s.nodeId), true)))
      .map((s) => ({ nodeId: s.nodeId, displayPath: s.displayPath, score: s.score }));
  }, [item.suggestions]);

  const isSearch = query.trim().length >= 2;
  const options: Option[] = isSearch
    ? results.map((r) => ({ nodeId: r.nodeId, displayPath: r.displayPath }))
    : suggestions;

  // Debounced search (min 2 chars).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isSearch) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api.lab
        .taxonomySearch(query.trim())
        .then(({ nodes }) => setResults(nodes))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isSearch]);

  // Reset the highlight whenever the visible list changes.
  useEffect(() => setActive(0), [query, results.length]);

  const pick = useCallback(
    (nodeId: string | undefined) => {
      if (!nodeId || busy) return;
      onPick(nodeId);
    },
    [busy, onPick]
  );

  // Keyboard navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!busy) onClose();
        return;
      }
      if (options.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        pick(options[active]?.nodeId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, active, busy, onClose, pick]);

  // Keep the highlighted row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[12vh] bg-overlay/80 backdrop-blur-md animate-fade-in"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        className="relative w-full max-w-xl flex flex-col max-h-[70vh] rounded-2xl border border-border/[0.1] bg-card shadow-2xl animate-modal-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — what we're categorizing */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border/[0.06]">
          <div className="shrink-0 grid size-9 place-items-center rounded-lg border border-border/[0.08] bg-surface text-muted-foreground/50">
            <Tag size={16} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/45">
              Assign a category
            </p>
            <p className="text-sm font-semibold text-foreground/95 truncate">
              {item.title || "Untitled product"}
            </p>
            {item.sourceCategory && (
              <p className="mt-0.5 text-[11px] text-muted-foreground/55 truncate">
                source: <span className="text-muted-foreground/80">{item.sourceCategory}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => { if (!busy) onClose(); }}
            className="shrink-0 size-8 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover hover:text-foreground flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 pt-4">
          <label className="flex items-center gap-2 rounded-lg border border-border/[0.1] bg-surface px-3 py-2 focus-within:border-primary/40 transition-colors">
            {searching ? (
              <Loader2 size={14} className="animate-spin text-muted-foreground/50" />
            ) : (
              <Search size={14} className="text-muted-foreground/45" />
            )}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the taxonomy (e.g. 'Smartphones', 'Tents')…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </label>
        </div>

        {/* Options — suggestions when idle, live results when searching */}
        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
          {!isSearch && suggestions.length > 0 && (
            <p className="px-2 pb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
              <Sparkles size={10} className="text-primary/70" /> Suggested
            </p>
          )}

          {options.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground/50">
              {isSearch
                ? searching
                  ? "Searching…"
                  : "No matching categories."
                : "No suggestions — type to search the taxonomy."}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {options.map((o, i) => {
                const on = i === active;
                const pct = o.score != null ? Math.round(o.score * 100) : null;
                return (
                  <button
                    key={o.nodeId}
                    data-idx={i}
                    type="button"
                    disabled={busy}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o.nodeId)}
                    className={[
                      "group flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50",
                      on ? "bg-surface-hover" : "hover:bg-surface-hover",
                    ].join(" ")}
                  >
                    <CategoryBreadcrumb displayPath={o.displayPath} className="flex-1 min-w-0 text-xs" />
                    {pct != null && (
                      <span
                        className={[
                          "shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
                          pct >= 75
                            ? "bg-success/15 text-success"
                            : pct >= 50
                            ? "bg-primary/15 text-primary"
                            : "bg-surface text-muted-foreground/60",
                        ].join(" ")}
                      >
                        {pct}%
                      </span>
                    )}
                    <span
                      className={[
                        "shrink-0 size-6 rounded-md grid place-items-center text-muted-foreground/40 transition-colors",
                        on ? "text-primary" : "group-hover:text-primary",
                      ].join(" ")}
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-t border-border/[0.06] text-[10px] text-muted-foreground/45">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-surface px-1 py-0.5 border border-border/[0.1]">↑</kbd>
            <kbd className="rounded bg-surface px-1 py-0.5 border border-border/[0.1]">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-surface px-1 py-0.5 border border-border/[0.1]"><CornerDownLeft size={9} /></kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-surface px-1 py-0.5 border border-border/[0.1]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
