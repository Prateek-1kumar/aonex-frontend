// Shared display formatters — the single source of truth for how amounts and
// dates are rendered across the product, so the same value never appears in two
// different styles. Pure functions, no UI/Tailwind concerns.

/**
 * Format a monetary amount with its currency.
 *
 * Uses `Intl.NumberFormat` so any ISO 4217 code gets its correct symbol and
 * grouping (no hardcoded symbol table). Whole amounts drop the trailing
 * decimals; fractional amounts keep cents. Falls back to a plain "CODE amount"
 * string when the currency isn't a usable 3-letter code, and to the bare
 * currency code when there is no numeric amount.
 *
 * @returns the formatted string, or null when there is nothing to show.
 */
export function formatPrice(
  amount: number | string | null | undefined,
  currency?: string | null,
): string | null {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const code = currency?.trim().toUpperCase() || null;

  if (n == null || !Number.isFinite(n)) {
    return code; // currency-only, or null when neither is present
  }

  if (code && /^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
      }).format(n);
    } catch {
      /* not a real ISO code — fall through to the plain form */
    }
  }

  const num = n.toLocaleString();
  return code ? `${code} ${num}` : num;
}

/** Absolute date, e.g. "Jun 4, 2026". Returns "—" for missing/invalid input. */
export function formatDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, opts);
}

/** Absolute date + time, e.g. "Jun 4, 2026, 3:21 PM". Returns "—" when invalid. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/** Compact relative time: "5s ago", "3m ago", "2h ago", "4d ago". */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${Math.max(sec, 0)}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
