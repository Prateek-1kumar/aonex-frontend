import type { CatalogProduct } from "@/lib/api";

/**
 * Derive a display string for a product's price. Strategy:
 *  - Use the explicit base_price + currency when present.
 *  - Otherwise look at variant prices; if all the same, show that. If they
 *    span a range, show "min – max". If no variant has a price either, null.
 *
 * Currency is the explicit one if set; otherwise the most common currency
 * across variants. Returns `null` when no price information exists at all.
 */
export function getDisplayPrice(product: CatalogProduct): {
  text: string;
  isRange: boolean;
} | null {
  const v = product.current_version;

  // Pull variant prices once; we may need them for currency fallback too.
  const variantPrices = product.variants
    .map((vt) => (vt.price != null ? Number(vt.price) : null))
    .filter((p): p is number => p != null && Number.isFinite(p));

  // Decide the currency: explicit wins; otherwise majority from variants.
  const currency =
    v?.currency ??
    pickMajority(product.variants.map((vt) => vt.currency).filter((c): c is string => !!c)) ??
    "";

  // Explicit product-level base price wins.
  if (v?.basePrice != null) {
    const n = Number(v.basePrice);
    if (Number.isFinite(n)) {
      return { text: format(currency, n), isRange: false };
    }
  }

  if (variantPrices.length === 0) return null;

  const min = Math.min(...variantPrices);
  const max = Math.max(...variantPrices);
  if (min === max) return { text: format(currency, min), isRange: false };
  return { text: `${format(currency, min)} – ${max.toLocaleString()}`, isRange: true };
}

function format(currency: string, n: number): string {
  const num = n.toLocaleString();
  return currency ? `${currency} ${num}` : num;
}

function pickMajority<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = -1;
  for (const [v, n] of counts) {
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}
