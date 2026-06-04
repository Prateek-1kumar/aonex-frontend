"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, AlertCircle, CheckCircle2, XCircle, ChevronRight, Package, FileSearch,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { QueueItem, StagedDetail, Evidence } from "../lib/lab-types";
import { StagedProductForm } from "./StagedProductForm";
import { ExtractedDetails } from "./ExtractedDetails";
import { LabEvidencePane } from "./LabEvidencePane";
import { MatchCandidateBanner } from "./MatchCandidateBanner";

interface Props {
  item: QueueItem;
  onClose: () => void;
  /** Fired after a successful approve / reject / link so the parent can drop the row. */
  onResolved: (id: string, kind: "approved" | "rejected" | "linked", message: string) => void;
}

// Gate fields the reviewer can fill from the form (mirrors StagedProductForm).
const FILLABLE_FIELDS = ["title", "brand", "category_path", "identifier"] as const;

/** Pull a hero image URL out of the staged observations blob, if present. */
function heroImageOf(detail: StagedDetail | null): string | null {
  const rp = detail?.observations?.rawPayload as { images?: Array<{ url?: string; role?: string }> } | undefined;
  if (!rp || !Array.isArray(rp.images)) return null;
  const hero = rp.images.find((i) => i?.role === "hero") ?? rp.images[0];
  return typeof hero?.url === "string" ? hero.url : null;
}

export function PushToCatalogModal({ item, onClose, onResolved }: Props) {
  const id = item.stagedProductId;

  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<StagedDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [stillMissing, setStillMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "approve" | "reject" | "link">(null);

  const [showEvidence, setShowEvidence] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  // Mount + escape-to-close + scroll lock
  useEffect(() => {
    setMounted(true);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose, busy]);

  // Load the staged detail
  useEffect(() => {
    let cancelled = false;
    api.lab.getStaged(id)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e: Error) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [id]);

  // Load evidence lazily — only the first time the reviewer opens it
  useEffect(() => {
    if (!showEvidence || evidence !== null) return;
    let cancelled = false;
    api.lab.evidence(id)
      .then((e) => { if (!cancelled) setEvidence(e); })
      .catch(() => { if (!cancelled) setEvidence({ kind: "none", content: null }); });
    return () => { cancelled = true; };
  }, [showEvidence, evidence, id]);

  function handleFillChange(field: string, value: string) {
    setActionError(null);
    setFillValues((prev) => ({ ...prev, [field]: value }));
    if (stillMissing.includes(field)) setStillMissing((prev) => prev.filter((f) => f !== field));
  }

  const missingFields = detail?.missingFields ?? item.missingFields;
  const missingCount = missingFields.length;

  const priceSatisfied =
    !missingFields.includes("pricing.primary") ||
    ((fillValues["price"] ?? "").trim() !== "" && (fillValues["currency"] ?? "").trim() !== "");
  const canApprove =
    !!detail &&
    priceSatisfied &&
    missingFields
      .filter((f): f is typeof FILLABLE_FIELDS[number] => (FILLABLE_FIELDS as readonly string[]).includes(f))
      .every((f) => (fillValues[f] ?? "").trim() !== "");

  const liveCandidates = detail?.matchCandidates?.filter((c) => c.kind === "live") ?? [];
  const hero = useMemo(() => heroImageOf(detail), [detail]);

  async function handleApprove() {
    if (!detail) return;
    setBusy("approve");
    setActionError(null);
    try {
      const r = await api.lab.approve(id, fillValues);
      if (r.ok === false) {
        setStillMissing(r.stillMissing);
        setActionError("Fill the highlighted fields before pushing to catalog.");
      } else {
        onResolved(id, "approved", `Pushed to catalog · product ${r.productId.slice(0, 8)}…`);
      }
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    setActionError(null);
    try {
      await api.lab.reject(id);
      onResolved(id, "rejected", "Staged product rejected.");
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleLink(productId: string) {
    if (!detail) return;
    setBusy("link");
    setActionError(null);
    try {
      const r = await api.lab.link(id, productId, fillValues);
      if (r.ok === false) {
        setStillMissing(r.stillMissing);
        setActionError("Fill the highlighted fields before linking.");
      } else {
        onResolved(id, "linked", `Linked to product ${r.productId.slice(0, 8)}…`);
      }
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!mounted) return null;

  const title = item.denormTitle ?? "Untitled product";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-border/[0.06] bg-card/95 backdrop-blur rounded-t-2xl">
          <div className="size-12 rounded-xl bg-surface border border-border/[0.08] overflow-hidden flex items-center justify-center shrink-0">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote merchant CDN URL
              <img src={hero} alt="" className="size-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Package size={20} className="text-muted-foreground/40" strokeWidth={1.4} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground/95 truncate">{title}</h2>
              {missingCount === 0 ? (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  <CheckCircle2 size={10} /> Ready
                </span>
              ) : (
                <span className="shrink-0 rounded-md border border-warning/25 bg-warning/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                  {missingCount} to complete
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/60">
              {item.denormBrand && <span className="text-foreground/70 font-medium">{item.denormBrand}</span>}
              {item.denormBrand && <span>·</span>}
              <span className="capitalize">{item.sourceKind}</span>
              <span>·</span>
              <span>{formatRelativeTime(item.createdAt)}</span>
              {formatPrice(item.denormPrice, item.denormCurrency) && (
                <>
                  <span>·</span>
                  <span className="tabular-nums text-foreground/80 font-semibold">
                    {formatPrice(item.denormPrice, item.denormCurrency)}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={!!busy}
            className="size-9 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover flex items-center justify-center shrink-0 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">
          {loadError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle size={15} /> {loadError}
            </div>
          )}

          {!detail && !loadError && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/[0.08] bg-card p-5 space-y-3 animate-pulse">
                <div className="h-3 rounded bg-surface w-1/3" />
                <div className="h-9 rounded bg-surface" />
                <div className="h-9 rounded bg-surface" />
                <div className="h-9 rounded bg-surface" />
              </div>
            </div>
          )}

          {detail && (
            <>
              {liveCandidates.length > 0 && (
                <MatchCandidateBanner
                  candidates={liveCandidates}
                  onLink={(pid) => void handleLink(pid)}
                  busy={!!busy}
                />
              )}

              <StagedProductForm
                detail={detail}
                fillValues={fillValues}
                onChange={handleFillChange}
                stillMissing={stillMissing}
              />

              <ExtractedDetails observations={detail.observations} />

              {/* Source evidence — collapsed until requested */}
              <div className="rounded-xl border border-border/[0.08] bg-card overflow-hidden">
                <button
                  onClick={() => setShowEvidence((s) => !s)}
                  className="w-full flex items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-hover transition-colors"
                >
                  <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    <FileSearch size={13} className="text-primary" />
                    Source Evidence
                  </span>
                  <ChevronRight
                    size={14}
                    className={`text-muted-foreground/50 transition-transform ${showEvidence ? "rotate-90" : ""}`}
                  />
                </button>
                {showEvidence && (
                  <div className="border-t border-border/[0.06] p-3 h-[380px]">
                    <LabEvidencePane evidence={evidence} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t border-border/[0.06] bg-card/95 backdrop-blur rounded-b-2xl">
          <div className="min-w-0 flex items-center gap-2">
            {actionError && (
              <span className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={13} className="shrink-0" /> {actionError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void handleReject()}
              disabled={!detail || !!busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border/[0.08] text-danger/80 text-sm font-semibold hover:bg-danger/10 transition-colors disabled:opacity-40"
            >
              {busy === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Reject
            </button>
            <button
              onClick={() => void handleApprove()}
              disabled={!canApprove || !!busy}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-success/15 border border-success/30 text-success text-sm font-semibold hover:bg-success/25 transition-colors disabled:opacity-40"
            >
              {busy === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Push to Catalog
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
