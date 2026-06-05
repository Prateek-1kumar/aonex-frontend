"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Check, XCircle, Pencil, Loader2, Sparkles, AlertCircle, ArrowRight, Wand2,
} from "lucide-react";
import {
  api,
  type EnrichmentProposalView,
  type ProposalFieldView,
  type EnrichGroup,
  type EnrichFieldDecision,
  type EnrichCandidateDecision,
} from "@/lib/api";

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

  const [fieldDecs, setFieldDecs] = useState<Record<string, FieldDecisionState>>(() => {
    const init: Record<string, FieldDecisionState> = {};
    for (const f of proposal.fields) init[f.attributeCode] = { decision: f.valid ? "accept" : "reject" };
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

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ group: g, fields: proposal.fields.filter((f) => f.group === g) }))
        .filter((x) => x.fields.length > 0),
    [proposal.fields]
  );

  const before = proposal.scoreBefore?.completeness ?? 0;
  const after = proposal.scoreAfter?.completeness ?? 0;
  const acceptedCount =
    Object.values(fieldDecs).filter((d) => d.decision !== "reject").length +
    Object.values(candDecs).filter((d) => d === "accept").length;

  function setField(code: string, next: FieldDecisionState) {
    setFieldDecs((p) => ({ ...p, [code]: next }));
  }
  function acceptAll() {
    setFieldDecs(() => {
      const next: Record<string, FieldDecisionState> = {};
      for (const f of proposal.fields) next[f.attributeCode] = { decision: f.valid ? "accept" : "reject" };
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
      const fieldDecisions = proposal.fields
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

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-overlay/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-border/[0.1] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — score delta */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-border/[0.06] bg-card/95 backdrop-blur rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Wand2 size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-bold text-foreground/95 leading-tight">Review enrichment</h2>
              <p className="text-[11px] text-muted-foreground/55 truncate">
                {proposal.archetype ?? "generic"}{proposal.model ? ` · ${proposal.model}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ScoreDelta before={before} after={after} />
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
              {proposal.fields.length} field{proposal.fields.length === 1 ? "" : "s"}
              {proposal.candidates.length > 0 ? ` · ${proposal.candidates.length} discovered` : ""}
            </p>
            <button
              onClick={acceptAll}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Accept all
            </button>
          </div>

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
                        <p className="mt-1 text-xs text-foreground/80">{renderVal(c.value)}</p>
                        {c.reasoning && (
                          <p className="mt-1 text-[11px] italic text-muted-foreground/55">{c.reasoning}</p>
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
              className="px-4 py-1.5 rounded-lg bg-success/15 border border-success/30 text-success text-xs font-semibold hover:bg-success/25 disabled:opacity-40 flex items-center gap-1.5"
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

function ScoreDelta({ before, after }: { before: number; after: number }) {
  const up = after >= before;
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5">
      <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{Math.round(before)}</span>
      <ArrowRight size={12} className="text-muted-foreground/40" />
      <span className={`text-sm font-bold tabular-nums ${up ? "text-success" : "text-foreground/80"}`}>
        {Math.round(after)}
      </span>
    </div>
  );
}

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
      : renderVal(field.after);

  return (
    <div
      className={[
        "rounded-lg border px-4 py-3 transition-colors",
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
            {!field.valid && (
              <span className="text-[10px] text-warning">⚠ {field.validationError ?? "invalid"}</span>
            )}
          </div>

          <div className="mt-1.5 flex items-start gap-2 text-xs">
            {field.before != null && field.before !== "" && (
              <>
                <span className="text-muted-foreground/45 line-through break-words">{renderVal(field.before)}</span>
                <ArrowRight size={12} className="mt-0.5 text-muted-foreground/35 shrink-0" />
              </>
            )}
            {state.decision === "edit" ? (
              <input
                value={String(afterShown)}
                onChange={(e) => onChange({ decision: "edit", editedValue: e.target.value })}
                className="flex-1 bg-card border border-primary/40 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/70"
                autoFocus
              />
            ) : (
              <span className="text-foreground/85 break-words">{renderVal(field.after)}</span>
            )}
          </div>

          {field.reasoning && state.decision !== "edit" && (
            <p className="mt-1 text-[11px] italic text-muted-foreground/50 line-clamp-2">{field.reasoning}</p>
          )}
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
