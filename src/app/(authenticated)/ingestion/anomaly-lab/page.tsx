"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import type {
  ReviewCluster,
  ReviewTaskDetail,
  TaskEvidence,
} from "./types";
import { ClusterList } from "./components/ClusterList";
import { DetailPane } from "./components/DetailPane";
import { EvidencePane } from "./components/EvidencePane";

type Toast = { type: "success" | "error"; message: string } | null;

export default function AnomalyLabPage() {
  const [clusters, setClusters] = useState<ReviewCluster[]>([]);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewTaskDetail[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<TaskEvidence | null>(null);
  const [busy, setBusy] = useState<string | null>("load-clusters");
  const [toast, setToast] = useState<Toast>(null);

  const refresh = useCallback(async () => {
    setBusy("load-clusters");
    try {
      const cs = await api.listReviewClusters("open");
      setClusters(cs);
      if (cs.length > 0 && !selectedClusterKey) {
        setSelectedClusterKey(cs[0]!.clusterKey);
      }
    } catch (e) {
      setToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }, [selectedClusterKey]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!selectedClusterKey) {
      setItems([]);
      setSelectedTaskId(null);
      return;
    }
    setBusy("load-items");
    api
      .listClusterItems(selectedClusterKey)
      .then((it) => {
        setItems(it);
        setSelectedTaskId(it[0]?.id ?? null);
      })
      .catch((e) => setToast({ type: "error", message: (e as Error).message }))
      .finally(() => setBusy(null));
  }, [selectedClusterKey]);

  useEffect(() => {
    if (!selectedTaskId) {
      setEvidence(null);
      return;
    }
    api
      .getTaskEvidence(selectedTaskId)
      .then(setEvidence)
      .catch(() => setEvidence(null));
  }, [selectedTaskId]);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const onClusterResolved = useCallback(async () => {
    await refresh();
    showToast({ type: "success", message: "Cluster resolved." });
  }, [refresh, showToast]);

  const onTaskResolved = useCallback(async () => {
    if (selectedClusterKey) {
      const remaining = items.filter((i) => i.id !== selectedTaskId);
      setItems(remaining);
      setSelectedTaskId(remaining[0]?.id ?? null);
      if (remaining.length === 0) await refresh();
    }
    showToast({ type: "success", message: "Resolved." });
  }, [items, selectedTaskId, selectedClusterKey, refresh, showToast]);

  const selectedCluster = clusters.find((c) => c.clusterKey === selectedClusterKey) ?? null;
  const selectedTask = items.find((i) => i.id === selectedTaskId) ?? null;
  const isClusterMode = (selectedCluster?.itemCount ?? 0) >= 3;

  return (
    <div className="animate-in h-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground">Anomaly Lab</h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Human Verification Queue
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={busy !== null}
          className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center disabled:opacity-40"
        >
          {busy === "load-clusters" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>

      {toast && (
        <div className={[
          "mb-5 flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
          toast.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400",
        ].join(" ")}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {clusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mb-4" strokeWidth={1.5} />
          <p className="font-serif text-lg font-semibold text-foreground/80">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">No clusters need review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4" style={{ height: "calc(100vh - 220px)" }}>
          <div className="col-span-3 overflow-y-auto">
            <ClusterList
              clusters={clusters}
              selectedKey={selectedClusterKey}
              onSelect={setSelectedClusterKey}
            />
          </div>
          <div className="col-span-6 overflow-y-auto">
            <DetailPane
              mode={isClusterMode ? "cluster" : "single"}
              cluster={selectedCluster}
              items={items}
              selectedTask={selectedTask}
              onSelectTask={setSelectedTaskId}
              onClusterResolved={onClusterResolved}
              onTaskResolved={onTaskResolved}
              onError={(msg) => showToast({ type: "error", message: msg })}
            />
          </div>
          <div className="col-span-3 overflow-y-auto">
            <EvidencePane evidence={evidence} />
          </div>
        </div>
      )}
    </div>
  );
}
