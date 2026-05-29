"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { QueueItem, QueueStats, StagedDetail, Evidence } from "./lib/lab-types";
import { QueueStatsHeader } from "./components/QueueStatsHeader";
import { StagedProductForm } from "./components/StagedProductForm";
import { ExtractedDetails } from "./components/ExtractedDetails";
import { LabEvidencePane } from "./components/LabEvidencePane";
import { MatchCandidateBanner } from "./components/MatchCandidateBanner";
import { ActionBar } from "./components/ActionBar";

type Toast = { type: "success" | "error"; message: string } | null;

export default function AnomalyLabPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<StagedDetail | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [stillMissing, setStillMissing] = useState<string[]>([]);

  // Use a ref so the keyboard handler always sees the latest value without re-registering
  const skippedIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  const loadQueue = useCallback(async (mergeWith?: QueueItem[], knownSkipped?: Set<string>) => {
    const res = await api.lab.queue();
    const skipped = knownSkipped ?? skippedIdsRef.current;
    if (mergeWith) {
      const existing = new Set(mergeWith.map((i) => i.stagedProductId));
      const newItems = res.items.filter(
        (i) => !existing.has(i.stagedProductId) && !skipped.has(i.stagedProductId)
      );
      return [...mergeWith, ...newItems];
    }
    return res.items.filter((i) => !skipped.has(i.stagedProductId));
  }, []);

  // Mount: load queue + stats
  useEffect(() => {
    async function init() {
      setInitialLoading(true);
      try {
        const [items, s] = await Promise.all([loadQueue(), api.lab.stats()]);
        setQueue(items);
        queueRef.current = items;
        setStats(s);
      } catch (e) {
        showToast({ type: "error", message: (e as Error).message });
      } finally {
        setInitialLoading(false);
      }
    }
    void init();
  }, [loadQueue]);

  // When current item changes: load detail + evidence
  const current = queue[index] ?? null;

  useEffect(() => {
    if (!current) {
      setDetail(null);
      setEvidence(null);
      return;
    }
    let cancelled = false;
    const id = current.stagedProductId;
    setDetail(null);
    setEvidence(null);
    setFillValues({});
    setStillMissing([]);

    api.lab.getStaged(id).then((d) => {
      if (!cancelled) setDetail(d);
    }).catch(() => {
      if (!cancelled) showToast({ type: "error", message: "Failed to load staged product." });
    });
    api.lab.evidence(id).then((e) => {
      if (!cancelled) setEvidence(e);
    }).catch(() => {
      // Evidence is optional — don't block on failure
      if (!cancelled) setEvidence({ kind: "none", content: null });
    });

    return () => { cancelled = true; };
  }, [current?.stagedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFillChange(field: string, value: string) {
    setFillValues((prev) => ({ ...prev, [field]: value }));
    if (stillMissing.includes(field)) {
      setStillMissing((prev) => prev.filter((f) => f !== field));
    }
  }

  async function advance(fromIndex?: number) {
    const idx = fromIndex ?? indexRef.current;
    const nextIndex = idx + 1;
    setIndex(nextIndex);
    indexRef.current = nextIndex;

    // If within 5 of the end, prefetch more items
    const currentQueue = queueRef.current;
    if (nextIndex >= currentQueue.length - 5) {
      try {
        const res = await api.lab.queue();
        setQueue((prev) => {
          const viewed = prev.slice(0, nextIndex);               // items already shown this session
          const viewedIds = new Set(viewed.map((i) => i.stagedProductId));
          const freshTail = res.items.filter(
            (i) => !viewedIds.has(i.stagedProductId) && !skippedIdsRef.current.has(i.stagedProductId)
          );
          const merged = [...viewed, ...freshTail];
          queueRef.current = merged;
          return merged;
        });
      } catch {
        // silent — just use what we have
      }
    }
  }

  async function handleApprove() {
    if (!current || !detail) return;
    setBusy(true);
    try {
      const r = await api.lab.approve(current.stagedProductId, fillValues);
      if (r.ok === false) {
        setStillMissing(r.stillMissing);
        showToast({ type: "error", message: "Fill the highlighted fields." });
      } else {
        showToast({ type: "success", message: `Approved → product ${r.productId.slice(0, 8)}…` });
        await advance();
      }
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!current) return;
    setBusy(true);
    try {
      await api.lab.reject(current.stagedProductId);
      showToast({ type: "success", message: "Rejected." });
      await advance();
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(productId: string) {
    if (!current) return;
    setBusy(true);
    try {
      const r = await api.lab.link(current.stagedProductId, productId, fillValues);
      if (r.ok === false) {
        setStillMissing(r.stillMissing);
        showToast({ type: "error", message: "Fill the highlighted fields." });
      } else {
        showToast({ type: "success", message: `Linked to product ${r.productId.slice(0, 8)}…` });
        await advance();
      }
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    if (!current) return;
    skippedIdsRef.current.add(current.stagedProductId);
    void advance();
  }

  // Keyboard handler
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      switch (e.key.toLowerCase()) {
        case "a":
          void handleApprove();
          break;
        case "r":
          void handleReject();
          break;
        case "s":
          handleSkip();
          break;
        case "l": {
          const topLive = detail?.matchCandidates?.find((c) => c.kind === "live");
          if (topLive) void handleLink(topLive.productId);
          break;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, current, busy, fillValues]);

  // Keep indexRef in sync
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const FILLABLE_FIELDS = ["title", "brand", "category_path", "identifier"] as const;
  const priceSatisfied =
    !detail?.missingFields.includes("pricing.primary") ||
    ((fillValues["price"] ?? "").trim() !== "" &&
      (fillValues["currency"] ?? "").trim() !== "");
  const canApprove =
    !!detail &&
    priceSatisfied &&
    detail.missingFields
      .filter((f): f is typeof FILLABLE_FIELDS[number] => (FILLABLE_FIELDS as readonly string[]).includes(f))
      .every((f) => (fillValues[f] ?? "").trim() !== "");

  const topLiveCandidate = detail?.matchCandidates?.find((c) => c.kind === "live") ?? null;
  const liveCandidates = detail?.matchCandidates?.filter((c) => c.kind === "live") ?? [];

  const total = queue.length;
  const position = Math.min(index + 1, total);

  // --- Render ---

  if (initialLoading) {
    return (
      <div className="animate-in flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={28} className="animate-spin text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      </div>
    );
  }

  return (
    <div className="animate-in h-full flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground">Anomaly Lab</h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Focused Triage Queue
          </p>
        </div>
        <button
          onClick={async () => {
            setInitialLoading(true);
            try {
              const [items, s] = await Promise.all([
                loadQueue(undefined, skippedIdsRef.current),
                api.lab.stats(),
              ]);
              setQueue(items);
              queueRef.current = items;
              setStats(s);
              setIndex(0);
              indexRef.current = 0;
            } catch (e) {
              showToast({ type: "error", message: (e as Error).message });
            } finally {
              setInitialLoading(false);
            }
          }}
          disabled={initialLoading}
          className="size-9 rounded-lg bg-white/[0.04] border border-border/[0.08] text-foreground/70 hover:bg-white/[0.07] flex items-center justify-center disabled:opacity-40"
          aria-label="Refresh queue"
        >
          {initialLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
        </button>
      </div>

      {/* Stats header */}
      <QueueStatsHeader stats={stats} position={position} total={total} />

      {/* Toast */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm border",
            toast.type === "success"
              ? "bg-card border-emerald-500/20 text-emerald-400"
              : "bg-card border-red-500/20 text-red-400",
          ].join(" ")}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <AlertCircle size={15} className="shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Empty state */}
      {total === 0 || index >= total ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mb-4" strokeWidth={1.5} />
          <p className="font-serif text-lg font-semibold text-foreground/80">
            All clear — nothing staged
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The triage queue is empty. New items will appear here after ingestion.
          </p>
        </div>
      ) : (
        /* Main triage layout: 2-column */
        <div
          className="grid grid-cols-[1fr_360px] gap-4"
          style={{ minHeight: "calc(100vh - 280px)" }}
        >
          {/* Left column: banner + form + actions */}
          <div className="flex flex-col gap-4 min-w-0">
            {liveCandidates.length > 0 && (
              <MatchCandidateBanner
                candidates={liveCandidates}
                onLink={(pid) => void handleLink(pid)}
                busy={busy}
              />
            )}

            {detail ? (
              <>
                <StagedProductForm
                  detail={detail}
                  fillValues={fillValues}
                  onChange={handleFillChange}
                  stillMissing={stillMissing}
                />
                <ExtractedDetails observations={detail.observations} />
              </>
            ) : (
              /* Detail loading shimmer */
              <div className="rounded-xl border border-border/[0.08] bg-card p-5 space-y-3 animate-pulse">
                <div className="h-3 rounded bg-white/[0.05] w-1/3" />
                <div className="h-8 rounded bg-white/[0.04]" />
                <div className="h-8 rounded bg-white/[0.04]" />
                <div className="h-8 rounded bg-white/[0.04]" />
              </div>
            )}

            <ActionBar
              onApprove={() => void handleApprove()}
              onReject={() => void handleReject()}
              onSkip={handleSkip}
              onLink={
                topLiveCandidate
                  ? () => void handleLink(topLiveCandidate.productId)
                  : undefined
              }
              canApprove={canApprove}
              busy={busy}
            />

            {/* Keyboard hint */}
            <p className="text-[10px] text-muted-foreground/35 uppercase tracking-widest">
              Keyboard: A approve · R reject · S skip · L link — inactive while typing
            </p>
          </div>

          {/* Right column: evidence */}
          <div className="flex flex-col overflow-hidden">
            <LabEvidencePane evidence={evidence} />
          </div>
        </div>
      )}
    </div>
  );
}
