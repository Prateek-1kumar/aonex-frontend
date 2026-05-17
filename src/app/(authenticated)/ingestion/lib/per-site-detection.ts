// Hardcoded mirror of the backend's per-site parser registry (Phase 7).
// Keep in sync with packages/per-site-parsers/src/parsers/*.

export interface DetectedRetailer {
  name: string;
  domain: string;
  /** Whether browser fallback is typically needed */
  browserRequired: boolean;
}

const RETAILERS: DetectedRetailer[] = [
  { name: "Amazon", domain: "amazon.com", browserRequired: true },
  { name: "Amazon UK", domain: "amazon.co.uk", browserRequired: true },
  { name: "Amazon DE", domain: "amazon.de", browserRequired: true },
  { name: "Amazon IN", domain: "amazon.in", browserRequired: true },
  { name: "eBay", domain: "ebay.com", browserRequired: false },
  { name: "Walmart", domain: "walmart.com", browserRequired: true },
  { name: "Best Buy", domain: "bestbuy.com", browserRequired: true },
  { name: "Best Buy CA", domain: "bestbuy.ca", browserRequired: true },
  { name: "Croma", domain: "croma.com", browserRequired: false }
];

export function detectRetailer(url: string): DetectedRetailer | null {
  if (!url) return null;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const r of RETAILERS) {
    if (hostname === r.domain || hostname.endsWith(`.${r.domain}`)) return r;
  }
  return null;
}
