import type { ListCatalogProductRow } from "./catalog-types";

/**
 * Derive a display string for a product's representative price from the
 * new-schema list row. Returns the pricing.currency + pricing.amount pair
 * formatted for display, or null when no pricing row exists.
 *
 * For full per-channel pricing see `winning_values.pricing` on the detail view.
 */
export function getDisplayPrice(product: ListCatalogProductRow): {
  text: string;
  isRange: false;
} | null {
  const p = product.pricing;
  if (!p) return null;
  const n = p.amount != null ? Number(p.amount) : null;
  if (n == null || !Number.isFinite(n)) {
    // Currency-only: at least show the currency code.
    if (p.currency) return { text: p.currency, isRange: false };
    return null;
  }
  return { text: format(p.currency, n), isRange: false };
}

function format(currency: string, n: number): string {
  const num = n.toLocaleString();
  return currency ? `${currency} ${num}` : num;
}

