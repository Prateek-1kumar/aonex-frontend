import type { ReviewCluster } from "../types";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-muted-foreground/40",
};

const SIGNAL_LABEL: Record<string, string> = {
  low_confidence_mapping: "Low confidence",
  missing_required_attribute: "Missing attr",
  field_conflict: "Field conflict",
  unit_conflict: "Unit conflict",
  potential_duplicate: "Potential dup",
  category_ambiguous: "Category amb",
  variant_incomplete: "Variant incomplete",
  price_anomaly: "Price anomaly",
};

export function ClusterList({
  clusters,
  selectedKey,
  onSelect,
}: {
  clusters: ReviewCluster[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 pr-1">
      {clusters.map((c) => {
        const active = selectedKey === c.clusterKey;
        return (
          <button
            key={c.clusterKey}
            onClick={() => onSelect(c.clusterKey)}
            className={[
              "w-full text-left rounded-xl border p-4 transition-all duration-150",
              active
                ? "border-primary/25 bg-primary/5"
                : "border-border/[0.07] bg-card hover:border-border/[0.12] hover:bg-white/[0.02]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full shrink-0 ${SEVERITY_DOT[c.severity] ?? SEVERITY_DOT.low}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {c.severity}
                </span>
              </div>
              <span className="text-xs tabular-nums font-bold text-foreground/80">{c.itemCount}</span>
            </div>
            <p className="text-sm font-semibold text-foreground/90 line-clamp-2">
              {SIGNAL_LABEL[c.signalKind] ?? c.signalKind}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-2">
              {new Date(c.lastUpdated).toLocaleString()}
            </p>
          </button>
        );
      })}
    </div>
  );
}
