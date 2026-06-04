import type { ListCatalogProductRow } from "./catalog-types";
import { formatPrice } from "@/lib/format";

/**
 * Derive a display string for a product's representative price from the
 * new-schema list row, using the shared `formatPrice` helper so list rows,
 * detail pricing, and ingestion history all render prices identically.
 *
 * For full per-channel pricing see `winning_values.pricing` on the detail view.
 */
export function getDisplayPrice(product: ListCatalogProductRow): {
  text: string;
  isRange: false;
} | null {
  if (!product.pricing) return null;
  const text = formatPrice(product.pricing.amount, product.pricing.currency);
  return text ? { text, isRange: false } : null;
}
