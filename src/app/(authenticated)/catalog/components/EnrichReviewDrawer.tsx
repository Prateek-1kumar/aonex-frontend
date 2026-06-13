"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Check, XCircle, Pencil, Loader2, Sparkles, AlertCircle, ArrowRight, Wand2, ShieldCheck,
  ChevronDown, ChevronUp, ShieldX,
} from "lucide-react";
import {
  api,
  type EnrichmentProposalView,
  type ProposalFieldView,
  type EnrichGroup,
  type EnrichFieldDecision,
  type EnrichCandidateDecision,
} from "@/lib/api";
import { asImageUrls, ThumbStrip, ContentValue } from "@/components/ui/value-display";
import GroundingBadge, { groundingTone } from "@/components/grounding-badge";
import CategoryBreadcrumb from "@/components/category-breadcrumb";
import { useCategoryPaths } from "@/app/(authenticated)/enrichment/lib/category-paths";

interface Props {
  productId: string;
  proposal: EnrichmentProposalView;
  onClose: () => void;
  /** Label for the primary action button (e.g. "Commit" / "Send to Review Commit"). */
  commitLabel?: string;
  /** Called with the user's decisions when the primary action is clicked. The
   *  parent decides whether that means apply (Sync) or review (send onward). */
  onCommit: (decisions: {
    fieldDecisions: EnrichFieldDecision[];
    candidateDecisions: EnrichCandidateDecision[];
  }) => Promise<void>;
}

const GROUP_LABEL: Record<EnrichGroup, string> = {
  core: "Existing fields",
  descriptive: "Descriptive",
  occasion: "Occasion",
  care: "Care & Usage",
  marketing: "Marketing",
  seo: "SEO",
  aeo: "AEO / GEO",
  category: "Categories",
};
const GROUP_ORDER: EnrichGroup[] = [
  "core", "descriptive", "occasion", "care", "marketing", "seo", "aeo", "category",
];

const ACRONYMS = new Set(["gtin", "mpn", "sku", "seo", "aeo", "geo", "faq", "url", "id"]);
function humanize(code: string): string {
  return code
    .split(/[_\s]+/).filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
function renderVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(" · ");
  }
  return JSON.stringify(v);
}

type FieldDecisionState = { decision: "accept" | "reject" | "edit"; editedValue?: string };

export function EnrichReviewDrawer({ productId, proposal, onClose, onCommit, commitLabel }: Props) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<"commit" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { resolve: resolvePath } = useCategoryPaths();

  // ── Partition fields: auto-applied · reviewable · speculative ────────────
  // Speculative = not accepted AND explicitly not proposable (unverified
  // fabrications / contradictions the engine suppressed). Shown read-only for
  // transparency, never as accept-by-default in the review queue.
  const autoAppliedFields = useMemo(
    () => proposal.fields.filter((f) => f.accepted === true),
    [proposal.fields]
  );
  const reviewableFields = useMemo(
    () => proposal.fields.filter((f) => f.accepted !== true && f.proposable !== false),
    [proposal.fields]
  );
  const speculativeFields = useMemo(
    () => proposal.fields.filter((f) => f.accepted !== true && f.proposable === false),
    [proposal.fields]
  );

  // Decision state only for reviewable fields
  const [fieldDecs, setFieldDecs] = useState<Record<string, FieldDecisionState>>(() => {
    const init: Record<string, FieldDecisionState> = {};
    for (const f of reviewableFields) init[f.attributeCode] = { decision: f.valid ? "accept" : "reject" };
    return init;
  });
  const [candDecs, setCandDecs] = useState<Record<string, "accept" | "reject">>(() => {
    const init: Record<string, "accept" | "reject"> = {};
    for (const c of proposal.candidates) init[c.key] = "accept";
    return init;
  });

  useEffect(() => {
    setMounted(true);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, busy]);

  // Group only the reviewable fields
  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ group: g, fields: reviewableFields.filter((f) => f.group === g) }))
        .filter((x) => x.fields.length > 0),
    [reviewableFields]
  );

  // Group auto-applied fields for display
  const autoAppliedGrouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ group: g, fields: autoAppliedFields.filter((f) => f.group === g) }))
        .filter((x) => x.fields.length > 0),
    [autoAppliedFields]
  );

  const before = proposal.scoreBefore?.completeness ?? 0;
  const after = proposal.scoreAfter?.completeness ?? 0;
  const contentBefore = proposal.scoreBefore?.contentQuality ?? 0;
  const contentAfter = proposal.scoreAfter?.contentQuality ?? 0;
  const groundingRate = proposal.scoreAfter?.groundingRate;

  // acceptedCount counts only reviewable decisions + candidate decisions
  const acceptedCount =
    Object.values(fieldDecs).filter((d) => d.decision !== "reject").length +
    Object.values(candDecs).filter((d) => d === "accept").length;

  function setField(code: string, next: FieldDecisionState) {
    setFieldDecs((p) => ({ ...p, [code]: next }));
  }
  function acceptAll() {
    setFieldDecs(() => {
      const next: Record<string, FieldDecisionState> = {};
      for (const f of reviewableFields) next[f.attributeCode] = { decision: f.valid ? "accept" : "reject" };
      return next;
    });
    setCandDecs(() => {
      const next: Record<string, "accept" | "reject"> = {};
      for (const c of proposal.candidates) next[c.key] = "accept";
      return next;
    });
  }

  async function handleCommit() {
    setBusy("commit");
    setError(null);
    try {
      // Only map reviewable fields — never include auto-applied ones
      const fieldDecisions = reviewableFields
        .map((f) => {
          const d = fieldDecs[f.attributeCode] ?? { decision: "reject" as const };
          return d.decision === "edit"
            ? { code: f.attributeCode, decision: "edit" as const, editedValue: d.editedValue }
            : { code: f.attributeCode, decision: d.decision };
        })
        .filter((d) => d.decision !== "reject");
      const candidateDecisions = proposal.candidates
        .map((c) => ({ key: c.key, decision: candDecs[c.key] ?? ("reject" as const) }))
        .filter((d) => d.decision === "accept");
      await onCommit({ fieldDecisions, candidateDecisions });
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function handleRejectAll() {
    setBusy("reject");
    setError(null);
    try {
      await api.enrich.reject(productId, proposal.proposalId);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  // Resolve archetype (taxonomy nodeId slug) to a display path
  const archetypeDisplayPath = proposal.archetype ? resolvePath(proposal.archetype) : null;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-overlay/80 backdrop-blur-md animate-fade-in"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-border/[0.1] bg-card shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — score delta */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-border/[0.06] bg-card/95 backdrop-blur rounded-t-2xl overflow-hidden">
          <div className="pointer-events-none absolute -left-10 -top-16 size-52 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.32),transparent_70%)] opacity-60 blur-2xl" />
          <div className="relative flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle,hsl(var(--primary)/0.6),transparent_70%)] opacity-70 blur-md" />
              <div className="relative size-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Wand2 size={16} className="text-primary" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-bold text-foreground/95 leading-tight">Review enrichment</h2>
              {/* Archetype as category breadcrumb */}
              {archetypeDisplayPath ? (
                <CategoryBreadcrumb
                  displayPath={archetypeDisplayPath}
                  className="text-[11px] text-muted-foreground/55 mt-0.5"
                />
              ) : (
                <p className="text-[11px] text-muted-foreground/55">
                  generic{proposal.model ? ` · ${proposal.model}` : ""}
                </p>
              )}
              {archetypeDisplayPath && proposal.model && (
                <p className="text-[10px] text-muted-foreground/40">{proposal.model}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ScoreDelta before={before} after={after} contentBefore={contentBefore} contentAfter={contentAfter} groundingRate={groundingRate} />
            <button
              onClick={() => { if (!busy) onClose(); }}
              className="size-9 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover flex items-center justify-center"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground/60">
              {reviewableFields.length} field{reviewableFields.length === 1 ? "" : "s"} to review
              {autoAppliedFields.length > 0 ? ` · ${autoAppliedFields.length} auto-applied` : ""}
              {proposal.candidates.length > 0 ? ` · ${proposal.candidates.length} discovered` : ""}
            </p>
            <button
              onClick={acceptAll}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Accept all
            </button>
          </div>

          {/* Reviewable fields grouped by category */}
          {grouped.map(({ group, fields }) => (
            <div key={group}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                {GROUP_LABEL[group]}
              </p>
              <div className="space-y-2">
                {fields.map((f) => (
                  <FieldRow
                    key={f.attributeCode}
                    field={f}
                    state={fieldDecs[f.attributeCode] ?? { decision: "reject" }}
                    onChange={(s) => setField(f.attributeCode, s)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Auto-applied section — read-only */}
          {autoAppliedGrouped.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
                <ShieldCheck size={12} /> Auto-applied (grounded)
              </p>
              <div className="space-y-2">
                {autoAppliedGrouped.map(({ group, fields }) => (
                  <div key={group}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                      {GROUP_LABEL[group]}
                    </p>
                    {fields.map((f) => (
                      <AutoAppliedFieldRow key={f.attributeCode} field={f} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Speculative section — suppressed (unverified / contradicted): shown
              read-only for transparency, never proposed. Collapsed by default. */}
          {speculativeFields.length > 0 && (
            <details className="group rounded-xl border border-danger/15 bg-danger/[0.02] px-4 py-2.5">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-danger/70">
                <ShieldX size={12} /> Speculative — not proposed ({speculativeFields.length})
                <ChevronDown size={12} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-1.5 text-[11px] text-muted-foreground/55">
                Values the engine could not anchor in the source (or that conflicted with another field). Suppressed from auto-apply and review; listed only so nothing is hidden.
              </p>
              <div className="mt-2 space-y-1.5">
                {speculativeFields.map((f) => (
                  <div key={f.attributeCode} className={`rounded-lg border border-l-2 border-border/[0.06] bg-surface/60 px-3 py-2 ${groundingTone(f.grounding ?? "unverified")}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground/80">{humanize(f.attributeCode)}</span>
                      {f.grounding && <GroundingBadge grounding={f.grounding} support={f.support} />}
                    </div>
                    <p className="mt-1 text-sm text-foreground/70 break-words line-clamp-2">{renderVal(f.after)}</p>
                    <FieldEvidence field={f} />
                  </div>
                ))}
              </div>
            </details>
          )}

          {proposal.candidates.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                <Sparkles size={12} /> New attributes discovered
              </p>
              <div className="space-y-2">
                {proposal.candidates.map((c) => (
                  <div
                    key={c.key}
                    className={[
                      "rounded-lg border px-4 py-3 transition-colors",
                      candDecs[c.key] === "accept"
                        ? "border-primary/30 bg-primary/[0.05]"
                        : "border-border/[0.08] bg-surface opacity-60",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground/90">{c.label}</span>
                          <span className="text-[9px] font-mono text-muted-foreground/45">{c.key}</span>
                          <span className="text-[9px] uppercase tracking-wider text-primary/70">{c.dataType}</span>
                        </div>
                        {asImageUrls(c.value) ? (
                          <div className="mt-1.5"><ThumbStrip urls={asImageUrls(c.value)!} /></div>
                        ) : (
                          <p className="mt-1 text-xs text-foreground/80 break-words line-clamp-3">{renderVal(c.value)}</p>
                        )}
                        {c.reasoning && (
                          <p className="mt-1 text-[11px] italic text-muted-foreground/55 line-clamp-2">{c.reasoning}</p>
                        )}
                      </div>
                      <AcceptReject
                        accepted={candDecs[c.key] === "accept"}
                        onAccept={() => setCandDecs((p) => ({ ...p, [c.key]: "accept" }))}
                        onReject={() => setCandDecs((p) => ({ ...p, [c.key]: "reject" }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t border-border/[0.06] bg-card/95 backdrop-blur rounded-b-2xl">
          <div className="min-w-0">
            {error ? (
              <span className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={13} /> {error}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/55">
                {acceptedCount} change{acceptedCount === 1 ? "" : "s"} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleRejectAll()}
              disabled={busy !== null}
              className="px-3.5 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-danger/80 text-xs font-semibold hover:bg-danger/10 disabled:opacity-40 flex items-center gap-1.5"
            >
              {busy === "reject" ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Reject
            </button>
            <button
              onClick={() => void handleCommit()}
              disabled={busy !== null || acceptedCount === 0}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-success to-success/85 text-background text-xs font-semibold shadow-lg shadow-success/25 hover:brightness-110 active:translate-y-px transition-all disabled:opacity-40 disabled:shadow-none flex items-center gap-1.5"
            >
              {busy === "commit" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {commitLabel ?? "Commit"} {acceptedCount > 0 ? acceptedCount : ""}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── ScoreDelta ────────────────────────────────────────────────────────────────

function ScoreDelta({
  before,
  after,
  contentBefore,
  contentAfter,
  groundingRate,
}: {
  before: number;
  after: number;
  contentBefore?: number;
  contentAfter?: number;
  groundingRate?: number | undefined;
}) {
  const up = after >= before;
  const contentUp = (contentAfter ?? 0) >= (contentBefore ?? 0);
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <div className="flex items-center gap-1.5 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5" title="Spec completeness">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Spec</span>
        <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{Math.round(before)}</span>
        <ArrowRight size={12} className="text-muted-foreground/40" />
        <span className={`text-sm font-bold tabular-nums ${up ? "text-success" : "text-foreground/80"}`}>
          {Math.round(after)}
        </span>
      </div>
      {(contentAfter != null && contentAfter > 0) && (
        <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.05] px-2.5 py-1.5" title="Content quality (description / SEO / marketing / AEO)">
          <span className="text-[9px] font-bold uppercase tracking-wider text-primary/60">Content</span>
          <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{Math.round(contentBefore ?? 0)}</span>
          <ArrowRight size={12} className="text-muted-foreground/40" />
          <span className={`text-sm font-bold tabular-nums ${contentUp ? "text-primary" : "text-foreground/80"}`}>
            {Math.round(contentAfter)}
          </span>
        </div>
      )}
      {groundingRate != null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
          <ShieldCheck size={10} />
          Grounding {Math.round(groundingRate * 100)}%
        </span>
      )}
    </div>
  );
}

// ── FieldEvidence ─────────────────────────────────────────────────────────────
// Expandable "why" disclosure: a consistency-conflict note (always visible), plus
// a toggle revealing the model reasoning, the cited source span, and the numeric
// grounding/support/confidence — the provenance a reviewer needs to trust a value.

function FieldEvidence({ field }: { field: ProposalFieldView }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(field.evidence || field.reasoning);
  if (!field.consistencyNote && !hasDetail) return null;

  return (
    <div className="mt-1.5">
      {field.consistencyNote && (
        <p className="flex items-start gap-1 text-[11px] font-medium text-danger/80">
          <ShieldX size={11} className="mt-0.5 shrink-0" /> Cross-field conflict: {field.consistencyNote}
        </p>
      )}
      {hasDetail && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-foreground/70"
          >
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />} {open ? "Hide evidence" : "Why this value?"}
          </button>
          {open && (
            <div className="mt-1 space-y-1 rounded-lg border border-border/[0.07] bg-card/60 px-2.5 py-2">
              {field.reasoning && <p className="text-[11px] italic text-muted-foreground/70">{field.reasoning}</p>}
              {field.evidence && (
                <p className="text-[11px] italic text-muted-foreground/60">Source: &ldquo;{field.evidence}&rdquo;</p>
              )}
              <p className="text-[10px] tabular-nums text-muted-foreground/45">
                grounding <span className="font-semibold">{field.grounding ?? "—"}</span>
                {field.support != null ? ` · support ${Math.round(field.support * 100)}%` : ""}
                {` · confidence ${Math.round(field.confidence * 100)}%`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── AutoAppliedFieldRow ───────────────────────────────────────────────────────
// Read-only view for fields already committed by the worker.

function AutoAppliedFieldRow({ field }: { field: ProposalFieldView }) {
  const afterImgs = asImageUrls(field.after);
  const hasBefore = field.before != null && field.before !== "";
  const beforeImgs = asImageUrls(field.before);

  return (
    <div className={`rounded-xl border border-l-2 border-success/20 bg-success/[0.03] px-4 py-3 mb-2 ${groundingTone(field.grounding ?? "grounded")}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground/90">{humanize(field.attributeCode)}</span>
            <ActionBadge action={field.action} />
            <span className="inline-flex items-center gap-1 rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
              auto-applied
            </span>
            {field.grounding && (
              <GroundingBadge grounding={field.grounding} support={field.support} />
            )}
            <span className="text-[10px] tabular-nums text-muted-foreground/45">
              {Math.round(field.confidence * 100)}%
            </span>
          </div>

          <div className="mt-2 space-y-1.5">
            {afterImgs ? (
              <ThumbStrip urls={afterImgs} />
            ) : (
              <p className="text-sm text-foreground/80 break-words whitespace-pre-wrap line-clamp-3">{renderVal(field.after)}</p>
            )}
            {hasBefore && (
              beforeImgs ? (
                <p className="text-[11px] text-muted-foreground/40">
                  Replaced {beforeImgs.length} previous image{beforeImgs.length === 1 ? "" : "s"}
                </p>
              ) : (
                <p className="flex items-baseline gap-1.5 text-[11px] text-muted-foreground/35">
                  <span className="shrink-0 font-semibold uppercase tracking-wider">was</span>
                  <span className="line-through line-clamp-2 break-words">{renderVal(field.before)}</span>
                </p>
              )
            )}
          </div>

          <FieldEvidence field={field} />
        </div>
      </div>
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────

function FieldRow({
  field, state, onChange,
}: {
  field: ProposalFieldView;
  state: FieldDecisionState;
  onChange: (s: FieldDecisionState) => void;
}) {
  const accepted = state.decision !== "reject";
  const editable = typeof field.after === "string";
  const afterShown =
    state.decision === "edit" && state.editedValue !== undefined
      ? state.editedValue
      : String(field.after ?? "");
  const longString = typeof field.after === "string" && field.after.length > 80;

  const afterImgs = state.decision === "edit" ? null : asImageUrls(field.after);
  const beforeImgs = asImageUrls(field.before);
  const hasBefore = field.before != null && field.before !== "";

  return (
    <div
      className={[
        "rounded-xl border border-l-2 px-4 py-3 transition-colors",
        groundingTone(field.grounding ?? "inferred"),
        !field.valid
          ? "border-warning/40 bg-warning/[0.04]"
          : accepted
            ? "border-border/[0.1] bg-surface"
            : "border-border/[0.06] bg-surface opacity-55",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground/90">{humanize(field.attributeCode)}</span>
            <ActionBadge action={field.action} />
            <span className="text-[10px] tabular-nums text-muted-foreground/45">
              {Math.round(field.confidence * 100)}%
            </span>
            {/* Grounding badge for reviewable fields */}
            {field.grounding && (
              <GroundingBadge grounding={field.grounding} support={field.support} />
            )}
            {!field.valid && (
              <span className="text-[10px] text-warning">⚠ {field.validationError ?? "invalid"}</span>
            )}
          </div>

          <div className="mt-2 space-y-1.5">
            {/* AFTER — the proposed value (focus) */}
            {state.decision === "edit" ? (
              longString ? (
                <textarea
                  value={String(afterShown)}
                  onChange={(e) => onChange({ decision: "edit", editedValue: e.target.value })}
                  rows={4}
                  className="w-full bg-card border border-primary/40 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed text-foreground focus:outline-none focus:border-primary/70 resize-y"
                  autoFocus
                />
              ) : (
                <input
                  value={String(afterShown)}
                  onChange={(e) => onChange({ decision: "edit", editedValue: e.target.value })}
                  className="w-full bg-card border border-primary/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/70"
                  autoFocus
                />
              )
            ) : afterImgs ? (
              <ThumbStrip urls={afterImgs} />
            ) : field.kind === "content" ? (
              <ContentValue value={field.after} />
            ) : (
              <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap line-clamp-4">{renderVal(field.after)}</p>
            )}

            {/* BEFORE — the value being replaced (secondary) */}
            {hasBefore && state.decision !== "edit" && (
              beforeImgs ? (
                <p className="text-[11px] text-muted-foreground/45">
                  Replacing {beforeImgs.length} current image{beforeImgs.length === 1 ? "" : "s"}
                </p>
              ) : (
                <p className="flex items-baseline gap-1.5 text-[11px] text-muted-foreground/40">
                  <span className="shrink-0 font-semibold uppercase tracking-wider">was</span>
                  <span className="line-through line-clamp-2 break-words">{renderVal(field.before)}</span>
                </p>
              )
            )}
          </div>

          {state.decision !== "edit" && <FieldEvidence field={field} />}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editable && (
            <button
              onClick={() =>
                onChange(
                  state.decision === "edit"
                    ? { decision: "accept" }
                    : { decision: "edit", editedValue: String(field.after) }
                )
              }
              className={[
                "size-7 rounded-md border flex items-center justify-center transition-colors",
                state.decision === "edit"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/[0.08] bg-surface text-muted-foreground/60 hover:text-foreground",
              ].join(" ")}
              title="Edit"
            >
              <Pencil size={12} />
            </button>
          )}
          <AcceptReject
            accepted={accepted}
            onAccept={() => onChange({ decision: "accept" })}
            onReject={() => onChange({ decision: "reject" })}
          />
        </div>
      </div>
    </div>
  );
}

function AcceptReject({
  accepted, onAccept, onReject,
}: {
  accepted: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onAccept}
        className={[
          "size-7 rounded-md border flex items-center justify-center transition-colors",
          accepted
            ? "border-success/40 bg-success/15 text-success"
            : "border-border/[0.08] bg-surface text-muted-foreground/50 hover:text-success",
        ].join(" ")}
        title="Accept"
      >
        <Check size={12} />
      </button>
      <button
        onClick={onReject}
        className={[
          "size-7 rounded-md border flex items-center justify-center transition-colors",
          !accepted
            ? "border-danger/40 bg-danger/15 text-danger"
            : "border-border/[0.08] bg-surface text-muted-foreground/50 hover:text-danger",
        ].join(" ")}
        title="Reject"
      >
        <XCircle size={12} />
      </button>
    </div>
  );
}

function ActionBadge({ action }: { action: ProposalFieldView["action"] }) {
  const map = {
    fill: { label: "fill", cls: "bg-primary/12 text-primary border-primary/25" },
    improve: { label: "improve", cls: "bg-warning/12 text-warning border-warning/25" },
    new: { label: "new", cls: "bg-success/12 text-success border-success/25" },
  } as const;
  const s = map[action];
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}
