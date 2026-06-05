// Frontend types mirroring the new single-table catalog backend shapes.
// Source of truth:
//   apps/api/src/services/new-catalog-list.ts  → ListCatalogProductRow
//   apps/api/src/services/new-catalog-read.ts  → NewCatalogProductView
//   apps/api/src/services/new-catalog-provenance.ts → ProvenanceResult

// ---------------------------------------------------------------------------
// List shape  (GET /api/catalog/products)
// ---------------------------------------------------------------------------

/**
 * One row in the catalog list response. Mirrors `ListCatalogProductRow` from
 * the backend. `current_version` is always null for new-schema rows.
 */
export interface ListCatalogProductRow {
  id: string;
  tenantId: string;
  merchantId: string;
  status: string;
  updatedAt: string; // ISO string after JSON serialisation
  /** Projected from winning_values.title._unscoped._unscoped.value */
  title: string | null;
  /** Projected from winning_values.brand._unscoped._unscoped.value */
  brand: string | null;
  /** Projected from winning_values.gtin._unscoped._unscoped.value */
  gtin: string | null;
  /** Projected from winning_values.category_path; null when uncategorised. */
  category: string | null;
  /** Always null for new-schema rows (legacy concept removed). */
  current_version: null;
  /** Always [] for new-schema rows (variants deferred per Phase 7). */
  variants: [];
  /**
   * Representative price for list display only.
   * Per-channel pricing lives on the detail endpoint.
   * `amount` is a numeric string from the database.
   */
  pricing: { currency: string; amount: string | null } | null;
  /**
   * Representative thumbnail URL projected from winning_values.images
   * (hero image preferred). Null when the product has no images.
   */
  imageUrl: string | null;
  /** Server-authoritative completeness score (0..100); null until first computed. */
  completenessScore: number | null;
  /** LLM content-quality score (0..100); null until enrichment sets it. */
  contentQualityScore: number | null;
  _meta: { schema: "new" };
}

// ---------------------------------------------------------------------------
// Detail shape  (GET /api/catalog/products/:id?consistency=strong)
// ---------------------------------------------------------------------------

/**
 * Pricing leaf within winning_values.pricing[channelId][locale].
 * Populated by the strong-mode read from catalog_pricing_current.
 */
export interface PricingLeaf {
  source: string;
  currency: string;
  /** Numeric string from the database. */
  primaryAmount: string | null;
  tiers: unknown;
  pricePerUnit: unknown;
  observedAt: string;
}

/**
 * Full product detail view. Mirrors `NewCatalogProductView` from the backend.
 *
 * winning_values shape contract:
 *   winning_values[attr][channelId][locale] = { value, ... }   (sync attrs)
 *   winning_values.pricing[channelId][locale]  = PricingLeaf
 *   winning_values.inventory[channelId][locKey] = { source, qty, observedAt }
 */
export interface CatalogProductView {
  product_id: string;
  tenant_id: string;
  merchant_id: string;
  primary_identifier: string;
  identity: unknown;
  status: string;
  family: string | null;
  values: unknown;
  /**
   * Attribute tree keyed by attr → channelId → locale → leaf.
   * `pricing` and `inventory` are special sub-objects; all others are
   * winning attribute values.
   */
  winning_values: Record<string, unknown> & {
    pricing?: Record<string, Record<string, PricingLeaf>>;
    inventory?: Record<string, Record<string, { source: string; qty: number; observedAt: string }>>;
  };
  schema_version: string;
  current_revision_id: number | null;
  parent_product_id: string | null;
  merged_into_product_id: string | null;
  created_at: string;
  updated_at: string;
  consistency: "eventual" | "strong";
}

// ---------------------------------------------------------------------------
// Provenance shape  (GET /api/catalog/products/:id/provenance/:attr)
// ---------------------------------------------------------------------------

/**
 * Mirrors `ProvenanceResult` from new-catalog-provenance.ts.
 * `winner` is the winning value leaf (may be null when no observations exist).
 */
export interface AttributeProvenance {
  attribute: string;
  channel: string;
  locale: string;
  winner: unknown;
  rule_fired: {
    rule_id: number | "wildcard";
    source_glob: string;
    priority: number;
  } | null;
  observation_id: number | null;
  observation_source: string | null;
  observation_observed_at: string | null;
  artifact_id: string | null;
  raw_payload_pointer: string | null;
}
