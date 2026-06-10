"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, X, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { TaxonomyNodeHit } from "@/lib/api";

interface TaxonomyPickerProps {
  /** Called when the user selects a node from results. Never fires for free text. */
  onSelect: (node: TaxonomyNodeHit) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TaxonomyPicker({ onSelect, disabled, placeholder }: TaxonomyPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaxonomyNodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search — fires only when q >= 2 chars
  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api.lab
        .taxonomySearch(q)
        .then(({ nodes }) => {
          setResults(nodes);
          setOpen(nodes.length > 0);
        })
        .catch(() => {
          setResults([]);
          setOpen(false);
        })
        .finally(() => setSearching(false));
    }, 250);
  }, []);

  useEffect(() => {
    runSearch(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleSelect(node: TaxonomyNodeHit) {
    onSelect(node);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function clearInput() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          disabled={disabled}
          placeholder={placeholder ?? "Search taxonomy (e.g. 'Jeans', 'Laptops')…"}
          className="w-full pl-8 pr-8 py-2 rounded-lg bg-surface border border-border/[0.08] text-sm text-foreground/90 placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        {searching ? (
          <Loader2
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground/50 pointer-events-none"
          />
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-4 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label="Clear search"
          >
            <X size={11} />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border/[0.08] bg-card shadow-xl text-sm"
        >
          {results.map((node) => (
            <li key={node.nodeId} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full text-left flex items-center gap-2 px-3.5 py-2.5 hover:bg-surface-hover transition-colors group"
                onClick={() => handleSelect(node)}
              >
                <span className="flex-1 min-w-0">
                  {/* Compact breadcrumb rendering */}
                  <span className="text-muted-foreground/55 text-[11px]">
                    {node.displayPath
                      .split(" › ")
                      .slice(0, -1)
                      .map((seg, i, arr) => (
                        <span key={i}>
                          {seg}
                          {i < arr.length - 1 && (
                            <ChevronRight
                              size={10}
                              className="inline mx-0.5 text-muted-foreground/35"
                            />
                          )}
                        </span>
                      ))}
                    {node.displayPath.split(" › ").length > 1 && (
                      <ChevronRight
                        size={10}
                        className="inline mx-0.5 text-muted-foreground/35"
                      />
                    )}
                  </span>
                  <span className="font-medium text-foreground/90 group-hover:text-primary transition-colors">
                    {node.displayPath.split(" › ").at(-1)}
                  </span>
                </span>
                {node.isLeaf && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-success/25 bg-success/10 text-success">
                    leaf
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border/[0.08] bg-card shadow-xl px-4 py-3 text-sm text-muted-foreground">
          No taxonomy nodes match &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}
