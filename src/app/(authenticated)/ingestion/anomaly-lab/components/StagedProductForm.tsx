import type { StagedDetail } from "../lib/lab-types";

interface StagedProductFormProps {
  detail: StagedDetail;
  fillValues: Record<string, string>;
  onChange: (field: string, value: string) => void;
  stillMissing: string[];
}

// Canonical fields we render in order
const FILLABLE_FIELDS = ["title", "brand", "category_path", "identifier"] as const;
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  brand: "Brand",
  category_path: "Category Path",
  identifier: "Identifier (GTIN, MPN, or your SKU)",
};

interface ObsRow {
  attributeCode: string;
  value: unknown;
  source?: string;
  confidence?: number | string;
  channelCode?: string;
  [key: string]: unknown;
}

interface PresentValue {
  value: string;
  source: string | undefined;
  confidence: string | undefined;
}

/** Safely pull a present-value + source/confidence badge from the observations blob. */
function extractPresent(
  field: string,
  observations: Record<string, unknown>,
  proposedIdentity?: Record<string, unknown>
): PresentValue | null {
  // observations.observations is an array of observation rows
  const rows = observations.observations;
  if (Array.isArray(rows)) {
    const obs = rows as ObsRow[];
    const row = obs.find((r) => r.attributeCode === field);
    if (row && row.value != null) {
      const conf = Number(row.confidence);
      return {
        value: String(row.value),
        source: row.source != null ? String(row.source) : undefined,
        confidence:
          Number.isFinite(conf)
            ? `${Math.round(conf * 100)}%`
            : undefined,
      };
    }
  }

  // Check identityHint for brand/gtin
  const hint = observations.identityHint;
  if (hint != null && typeof hint === "object") {
    const h = hint as Record<string, unknown>;
    if (field === "brand" && h.brand != null) {
      return { value: String(h.brand), source: undefined, confidence: undefined };
    }
    if (field === "identifier" && h.gtin != null) {
      return { value: String(h.gtin), source: "gtin", confidence: undefined };
    }
    if (field === "identifier" && h.mpn != null) {
      return { value: String(h.mpn), source: "mpn", confidence: undefined };
    }
  }

  // Check top-level proposedIdentity for common field names
  if (proposedIdentity && proposedIdentity[field] != null) {
    return { value: String(proposedIdentity[field]), source: undefined, confidence: undefined };
  }

  // Check pricingObservations for pricing.primary
  if (field === "pricing.primary") {
    const pricing = observations.pricingObservations;
    if (pricing != null && typeof pricing === "object") {
      const p = pricing as Record<string, unknown>;
      const tiers = p.tiers;
      if (Array.isArray(tiers) && tiers.length > 0) {
        const tier = tiers[0] as Record<string, unknown>;
        const currency = String(p.currency ?? "");
        const amount = tier.amount != null ? String(tier.amount) : null;
        if (amount) {
          return {
            value: `${currency} ${amount}`.trim(),
            source: String(p.source ?? "") || undefined,
            confidence: undefined,
          };
        }
      }
    }
  }

  return null;
}

function SourceBadge({ source, confidence }: { source: string | undefined; confidence: string | undefined }) {
  if (!source && !confidence) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-surface border border-border/[0.08] text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
      {source && <span>{source}</span>}
      {source && confidence && <span className="text-border/[0.4]">·</span>}
      {confidence && <span className="text-success/70">{confidence}</span>}
    </span>
  );
}

export function StagedProductForm({
  detail,
  fillValues,
  onChange,
  stillMissing,
}: StagedProductFormProps) {
  const missing = new Set(detail.missingFields);

  return (
    <div className="rounded-xl border border-border/[0.08] bg-card p-5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
        Product Fields
      </p>

      {/* Source chip */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Source
        </span>
        <span className="px-1.5 py-0.5 rounded bg-surface border border-border/[0.08] text-[10px] font-semibold text-muted-foreground/70">
          {detail.sourceKind}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/30 truncate max-w-[200px]">
          {detail.sourceArtifactId}
        </span>
      </div>

      {/* Fillable fields */}
      {FILLABLE_FIELDS.map((field) => {
        const isMissing = missing.has(field);
        const isStillMissing = stillMissing.includes(field);
        const present = isMissing ? null : extractPresent(field, detail.observations, detail.proposedIdentity);

        if (isMissing) {
          return (
            <div key={field}>
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-warning/80 mb-1">
                {FIELD_LABELS[field] ?? field}
                <span className="ml-1 text-warning/60 normal-case tracking-normal font-normal">
                  — required
                </span>
              </label>
              <input
                type="text"
                value={fillValues[field] ?? ""}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={`Enter ${FIELD_LABELS[field] ?? field}…`}
                className={[
                  "w-full bg-surface border rounded-lg px-3 py-2 text-sm text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none transition-colors",
                  isStillMissing
                    ? "border-danger/60 ring-1 ring-danger/30 focus:border-danger/80"
                    : "border-warning/30 focus:border-warning/50",
                ].join(" ")}
              />
              {isStillMissing && (
                <p className="mt-1 text-[10px] text-danger/80">This field is required to approve.</p>
              )}
            </div>
          );
        }

        // Present field — read-only display
        return (
          <div key={field}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-1">
              {FIELD_LABELS[field] ?? field}
            </p>
            <div className="flex items-center px-3 py-2 rounded-lg bg-surface border border-border/[0.06]">
              <span className="text-sm text-foreground/80">
                {present?.value ?? <span className="text-muted-foreground/40 italic">—</span>}
              </span>
              {present && (
                <SourceBadge source={present.source} confidence={present.confidence} />
              )}
            </div>
          </div>
        );
      })}

      {/* pricing.primary — special case */}
      {missing.has("pricing.primary") ? (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-warning/80 mb-1">
              Base Price
              <span className="ml-1 text-warning/60 normal-case tracking-normal font-normal">
                — required
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={fillValues["price"] ?? ""}
              onChange={(e) => onChange("price", e.target.value)}
              placeholder="e.g. 79999"
              className={[
                "w-full bg-surface border rounded-lg px-3 py-2 text-sm text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none transition-colors",
                stillMissing.includes("pricing.primary")
                  ? "border-danger/60 ring-1 ring-danger/30 focus:border-danger/80"
                  : "border-warning/30 focus:border-warning/50",
              ].join(" ")}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-warning/80 mb-1">
              Currency
              <span className="ml-1 text-warning/60 normal-case tracking-normal font-normal">
                — required
              </span>
            </label>
            <input
              type="text"
              maxLength={3}
              value={fillValues["currency"] ?? ""}
              onChange={(e) => onChange("currency", e.target.value.toUpperCase())}
              placeholder="INR"
              className={[
                "w-full bg-surface border rounded-lg px-3 py-2 text-sm text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none transition-colors",
                stillMissing.includes("pricing.primary")
                  ? "border-danger/60 ring-1 ring-danger/30 focus:border-danger/80"
                  : "border-warning/30 focus:border-warning/50",
              ].join(" ")}
            />
          </div>
          {stillMissing.includes("pricing.primary") && (
            <p className="text-[10px] text-danger/80">
              Both price and currency are required to approve.
            </p>
          )}
        </div>
      ) : (
        (() => {
          const present = extractPresent("pricing.primary", detail.observations, detail.proposedIdentity);
          return present ? (
            <div key="pricing.primary">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-1">
                Price
              </p>
              <div className="flex items-center px-3 py-2 rounded-lg bg-surface border border-border/[0.06]">
                <span className="text-sm text-foreground/80">{present.value}</span>
                <SourceBadge source={present.source} confidence={present.confidence} />
              </div>
            </div>
          ) : null;
        })()
      )}
    </div>
  );
}
