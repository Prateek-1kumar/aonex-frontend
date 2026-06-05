// Client-side catalog title resolver.
//
// Freshly-pushed enrichment proposals come back from the API with `title: null`
// (the push endpoint doesn't denormalise the product title onto the proposal
// row yet), which surfaced as "Untitled product" all over the Drafting Room,
// Review Commit and History views. Until the backend backfills that field, we
// resolve the real titles client-side from the catalog list — the same source
// the catalog page already reads — and use them as a fallback.
//
// Results are memoised at module scope so the (potentially multi-page) catalog
// fetch happens once per session and is shared across all enrichment views.
// `force` re-fetches when the user explicitly refreshes a page.

import { api } from "./api";

let cache: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;

const PAGE_SIZE = 200;
const MAX_PAGES = 25; // matches the catalog page's auto-load cap

export async function loadCatalogTitles(force = false): Promise<Map<string, string>> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const map = new Map<string, string>();
    let cursor: string | undefined;
    let pages = 0;
    do {
      const res = await api.catalog.list(cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE });
      for (const p of res.products) {
        if (p.title) map.set(p.id, p.title);
      }
      cursor = res.nextCursor ?? undefined;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);
    cache = map;
    inflight = null;
    return map;
  })();

  // If the fetch fails, don't poison the cache — let the next call retry.
  inflight.catch(() => { inflight = null; });
  return inflight;
}

/** Synchronous lookup against whatever is already cached (no fetch). */
export function cachedTitle(productId: string): string | null {
  return cache?.get(productId) ?? null;
}
