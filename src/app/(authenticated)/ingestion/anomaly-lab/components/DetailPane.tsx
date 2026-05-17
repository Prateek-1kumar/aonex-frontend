import { useState } from "react";
import { api } from "@/lib/api";
import type { ReviewCluster, ReviewTaskDetail, SignalKind } from "../types";
import { FieldConflictPane } from "./detail-panes/FieldConflictPane";
import { LowConfidenceMappingPane } from "./detail-panes/LowConfidenceMappingPane";
import { MissingAttributePane } from "./detail-panes/MissingAttributePane";
import { UnitConflictPane } from "./detail-panes/UnitConflictPane";
import { CategoryAmbiguousPane } from "./detail-panes/CategoryAmbiguousPane";
import { PotentialDuplicatePane } from "./detail-panes/PotentialDuplicatePane";
import { ValueConflictPane } from "./detail-panes/ValueConflictPane";
import { VariantIncompletePane } from "./detail-panes/VariantIncompletePane";
import { PriceAnomalyPane } from "./detail-panes/PriceAnomalyPane";
import { FailurePane } from "./detail-panes/FailurePane";

export interface DetailPaneProps {
  mode: "cluster" | "single";
  cluster: ReviewCluster | null;
  items: ReviewTaskDetail[];
  selectedTask: ReviewTaskDetail | null;
  onSelectTask: (id: string) => void;
  onClusterResolved: () => void;
  onTaskResolved: () => void;
  onError: (msg: string) => void;
}

export function DetailPane(props: DetailPaneProps) {
  const [busy, setBusy] = useState(false);

  if (!props.cluster) {
    return (
      <div className="rounded-xl border border-border/[0.08] bg-card p-6 h-full text-sm text-muted-foreground">
        Select a cluster to view details.
      </div>
    );
  }

  if (props.mode === "cluster") {
    return (
      <div className="rounded-xl border border-border/[0.08] bg-card p-6 h-full overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-base font-bold text-foreground/90">
            Cluster: {props.cluster.signalKind}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {props.cluster.itemCount} items · severity {props.cluster.severity}
          </p>
        </div>

        <PerSignalPane
          signalKind={props.cluster.signalKind}
          items={props.items}
          selectedTask={props.selectedTask}
          onSelectTask={props.onSelectTask}
          onTaskResolved={props.onTaskResolved}
          onError={props.onError}
        />

        <div className="mt-6 pt-4 border-t border-border/[0.05]">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
            Bulk actions
          </h4>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.resolveCluster(props.cluster!.clusterKey, "reject_all");
                  props.onClusterResolved();
                } catch (e) {
                  props.onError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-white/[0.04] border border-border/[0.08] text-red-400/80 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40"
            >
              Reject all {props.cluster.itemCount}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Single mode
  return (
    <div className="rounded-xl border border-border/[0.08] bg-card p-6 h-full overflow-y-auto">
      {!props.selectedTask ? (
        <p className="text-sm text-muted-foreground">No task selected.</p>
      ) : (
        <PerSignalPane
          signalKind={props.selectedTask.signalKind}
          items={[props.selectedTask]}
          selectedTask={props.selectedTask}
          onSelectTask={() => {}}
          onTaskResolved={props.onTaskResolved}
          onError={props.onError}
        />
      )}
    </div>
  );
}

function PerSignalPane(props: {
  signalKind: SignalKind;
  items: ReviewTaskDetail[];
  selectedTask: ReviewTaskDetail | null;
  onSelectTask: (id: string) => void;
  onTaskResolved: () => void;
  onError: (msg: string) => void;
}) {
  if (!props.selectedTask) return null;
  switch (props.signalKind) {
    case "field_conflict":
      return <FieldConflictPane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "low_confidence_mapping":
      return <LowConfidenceMappingPane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "missing_required_attribute":
      return <MissingAttributePane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "unit_conflict":
      return <UnitConflictPane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "value_conflict":
      return <ValueConflictPane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "category_ambiguous":
      return <CategoryAmbiguousPane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "potential_duplicate":
      return <PotentialDuplicatePane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "variant_incomplete":
      return <VariantIncompletePane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "price_anomaly":
      return <PriceAnomalyPane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    case "fetch_failed":
    case "captcha_wall":
    case "no_data_extracted":
    case "artifact_duplicate":
      return <FailurePane task={props.selectedTask} onResolved={props.onTaskResolved} onError={props.onError} />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown signal kind.</p>;
  }
}
