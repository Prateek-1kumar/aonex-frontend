"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// ─── Humanise fallback ────────────────────────────────────────────────────────
/**
 * When the taxonomy tree hasn't loaded yet or the nodeId isn't found in it,
 * convert the slug into a readable path: split on "/", title-case each segment,
 * join with " › ".  E.g. "fashion/clothing/jeans" → "Fashion › Clothing › Jeans".
 */
function humanizeSlug(nodeId: string): string {
  return nodeId
    .split("/")
    .filter(Boolean)
    .map((seg) =>
      seg
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    )
    .join(" › ");
}

// ─── Singleton cache ──────────────────────────────────────────────────────────
// We share one fetch + map across all hook instances in the same page so we
// don't hammer the API when multiple components mount simultaneously.

type Status = "idle" | "loading" | "ready" | "error";

let cachedMap: Map<string, string> | null = null;
let status: Status = "idle";
// Callbacks waiting for the first load to complete.
const waiters: Array<() => void> = [];

function notifyWaiters() {
  const copy = waiters.splice(0);
  for (const fn of copy) fn();
}

async function ensureLoaded(): Promise<void> {
  if (status === "ready" || status === "error") return;
  if (status === "loading") {
    // Wait until the in-flight request resolves.
    return new Promise<void>((resolve) => waiters.push(resolve));
  }
  status = "loading";
  try {
    const { nodes } = await api.catalog.taxonomyTree();
    cachedMap = new Map(nodes.map((n) => [n.nodeId, n.displayPath]));
    status = "ready";
  } catch {
    // On error leave the map null so we fall back to slug humanization.
    status = "error";
  }
  notifyWaiters();
}

// ─── Public hook ─────────────────────────────────────────────────────────────

export interface UseCategoryPaths {
  /** Resolve a nodeId slug to its display path (e.g. "Fashion › Clothing › Jeans").
   *  Returns the humanized slug when the tree hasn't loaded or the id is unknown.
   *  Returns "" when nodeId is null/undefined. */
  resolve: (nodeId: string | null | undefined) => string;
  /** True once the taxonomy tree has been fetched (may remain false on network error). */
  ready: boolean;
}

/**
 * Loads the taxonomy tree once (singleton cache, no refetch on remount) and
 * returns a `resolve(nodeId)` helper usable anywhere in the enrichment UI.
 */
export function useCategoryPaths(): UseCategoryPaths {
  const [ready, setReady] = useState<boolean>(status === "ready");
  // Keep a stable ref to the setter so the ensureLoaded callback doesn't
  // close over a stale value.
  const setReadyRef = useRef(setReady);
  setReadyRef.current = setReady;

  useEffect(() => {
    if (status === "ready") {
      setReadyRef.current(true);
      return;
    }
    let cancelled = false;
    ensureLoaded().then(() => {
      if (!cancelled) setReadyRef.current(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolve = (nodeId: string | null | undefined): string => {
    if (!nodeId) return "";
    if (cachedMap) return cachedMap.get(nodeId) ?? humanizeSlug(nodeId);
    return humanizeSlug(nodeId);
  };

  return { resolve, ready };
}
