"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Sparkles, ChevronRight,
  ChevronLeft, Wand2, GitCommitVertical, TrendingUp,
} from "lucide-react";
import {
  api,
  type ProposalListItem,
  type EnrichmentProposalView,
  type ProposalFieldView,
  type EnrichGroup,
  type EnrichFieldDecision,
} from "@/lib/api";
import { PageHero, StatCard } from "@/components/ui/page-chrome";
import { loadCatalogTitles } from "@/lib/catalog-titles";

type Toast = { type: "success" | "error"; message: string } | null;

const GROUP_LABEL: Record<EnrichGroup, string> = {
  core: "Enhanced core",
  descriptive: "Technical enrichment",
  occasion: "Occasion",
  care: "Care & usage",
  marketing: "AI narrative",
  seo: "SEO keywords",
  aeo: "AEO / GEO content",
  category: "Category mapping",
};
const ACR = new Set(["gtin", "seo", "aeo", "geo", "faq", "sku", "url"]);
function humanize(code: string): string {
  return code.split(/[_\s]+/).filter(Boolean)
    .map((w) => (ACR.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}
function renderVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.length ? v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") : "—";
  return JSON.stringify(v);
}
function afterValue(f: ProposalFieldView): unknown {
  return f.decision === "edit" && f.editedValue !== undefined ? f.editedValue : f.after;
}

export default function ReviewCommitPage() {
  const [list, setList] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrichmentProposalView | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.enrich.list({ status: "ready", reviewed: true });
      setList(res.proposals);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadCatalogTitles().then(setTitles).catch(() => {}); }, []);

  const titleOf = useCallback(
    (p: ProposalListItem) => p.title ?? titles.get(p.productId) ?? null,
    [titles]
  );

  const kpis = useMemo(() => {
    let uplift = 0, fields = 0;
    for (const p of list) {
      uplift += Math.round(p.scoreAfter?.completeness ?? 0) - Math.round(p.scoreBefore?.completeness ?? 0);
      fields += p.fieldCount;
    }
    return {
      waiting: list.length,
      avgUplift: list.length ? Math.round(uplift / list.length) : 0,
      fields,
    };
  }, [list]);

  async function openDetail(item: ProposalListItem) {
    setOpening(item.proposalId);
    try {
      const full = await api.enrich.get(item.productId, item.proposalId);
      setSelected(full);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setOpening(null);
    }
  }

  if (selected) {
    return (
      <ReviewDetail
        proposal={selected}
        fallbackTitle={titles.get(selected.productId) ?? null}
        onBack={() => setSelected(null)}
        onSynced={(score) => {
          setSelected(null);
          setList((prev) => prev.filter((x) => x.proposalId !== selected.proposalId));
          showToast({ type: "success", message: `Synced to catalog · completeness now ${Math.round(score)}` });
        }}
        onError={(m) => showToast({ type: "error", message: m })}
      />
    );
  }

  return (
    <div className="animate-in w-full">
      <PageHero
        icon={<GitCommitVertical size={22} strokeWidth={1.6} />}
        eyebrow="Enrichment"
        title="Review & Commit"
        description="Confirm the accepted changes for each draft and sync the enriched schema back to the catalog."
        actions={
          <>
            <Link href="/enrichment" className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover hover:text-foreground transition-colors">Drafting Room</Link>
            <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover hover:text-foreground transition-colors flex items-center gap-1.5"><RefreshCw size={13} /> Refresh</button>
          </>
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={<CheckCircle2 size={16} />} label="Waiting to Sync" value={kpis.waiting} tone="primary" />
          <StatCard icon={<TrendingUp size={16} />} label="Avg Uplift" value={`+${kpis.avgUplift}`} hint="pts" tone="success" />
          <StatCard icon={<Sparkles size={16} />} label="Fields" value={kpis.fields} tone="muted" />
        </div>
      </PageHero>

      <div className="rounded-2xl border border-border/[0.08] bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60"><Loader2 size={16} className="animate-spin" /> Loading drafts…</div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <div className="relative mx-auto mb-5 w-fit">
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--success)/0.45),transparent_70%)] opacity-50 blur-lg" />
              <div className="relative grid size-14 place-items-center rounded-2xl border border-border/[0.1] bg-surface text-muted-foreground/45">
                <CheckCircle2 size={24} strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground/55">No drafts waiting to sync.</p>
            <Link href="/enrichment" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Go to Drafting Room <ArrowRight size={13} /></Link>
          </div>
        ) : (
          <div className="divide-y divide-border/[0.04]">
            {list.map((p) => {
              const before = Math.round(p.scoreBefore?.completeness ?? 0);
              const after = Math.round(p.scoreAfter?.completeness ?? 0);
              return (
                <button key={p.proposalId} onClick={() => void openDetail(p)} disabled={opening !== null} className="w-full grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 items-center text-left hover:bg-surface-hover transition-colors disabled:opacity-60">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground/90 truncate">{titleOf(p) ?? <span className="italic text-muted-foreground/50">Untitled product</span>}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/55">
                      <span className="uppercase tracking-wider">{p.archetype ?? "generic"}</span>
                      <span>· {p.fieldCount} fields</span>
                      {p.candidateCount > 0 && <span className="inline-flex items-center gap-1 text-primary"><Sparkles size={11} /> {p.candidateCount} new</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5">
                    <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{before}</span>
                    <ArrowRight size={12} className="text-muted-foreground/40" />
                    <span className="text-sm font-bold tabular-nums text-success">{after}</span>
                  </div>
                  {opening === p.proposalId ? <Loader2 size={15} className="animate-spin text-muted-foreground/50" /> : <ChevronRight size={15} className="text-muted-foreground/40" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "bg-success/15 border-success/30 text-success" : "bg-danger/15 border-danger/30 text-danger"}`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{toast.message}
        </div>
      )}
    </div>
  );
}

// ── Detail (Image-6 style) ───────────────────────────────────────────────────

function ReviewDetail({
  proposal, fallbackTitle, onBack, onSynced, onError,
}: {
  proposal: EnrichmentProposalView;
  fallbackTitle: string | null;
  onBack: () => void;
  onSynced: (score: number) => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const accepted = proposal.fields.filter((f) => f.decision === "accept" || f.decision === "edit");
  const acceptedCandidates = proposal.candidates.filter((c) => c.decision === "accept");
  const before = Math.round(proposal.scoreBefore?.completeness ?? 0);
  const after = Math.round(proposal.scoreAfter?.completeness ?? 0);
  const delta = after - before;

  const title =
    (proposal.fields.find((f) => f.attributeCode === "title" && (f.decision === "accept" || f.decision === "edit")) &&
      String(afterValue(proposal.fields.find((f) => f.attributeCode === "title")!))) ||
    fallbackTitle ||
    "Product";

  async function handleSync() {
    setBusy(true);
    try {
      const fieldDecisions: EnrichFieldDecision[] = accepted.map((f) =>
        f.decision === "edit"
          ? { code: f.attributeCode, decision: "edit", editedValue: f.editedValue }
          : { code: f.attributeCode, decision: "accept" }
      );
      const candidateDecisions = acceptedCandidates.map((c) => ({ key: c.key, decision: "accept" as const }));
      const res = await api.enrich.apply(proposal.productId, proposal.proposalId, { fieldDecisions, candidateDecisions });
      onSynced(res.score);
    } catch (e) {
      onError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="animate-in w-full">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60 hover:text-foreground">
        <ChevronLeft size={14} /> Back to drafts
      </button>

      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/45">Review Commit</p>
      <h1 className="mt-1 font-serif text-3xl font-bold text-foreground/95">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground/55 uppercase tracking-wider">{proposal.archetype ?? "generic"}{proposal.model ? ` · ${proposal.model}` : ""}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Accepted changes */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
            Accepted changes ({accepted.length + acceptedCandidates.length})
          </p>
          <div className="space-y-3">
            {accepted.map((f) => (
              <div key={f.attributeCode} className="rounded-xl border border-border/[0.08] bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55">{GROUP_LABEL[f.group]} · {humanize(f.attributeCode)}</span>
                  <span className="text-[10px] font-semibold text-success">{Math.round(f.confidence * 100)}%</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {f.before != null && f.before !== "" && (
                    <p className="text-xs text-muted-foreground/45 line-through break-words">{renderVal(f.before)}</p>
                  )}
                  <p className="flex items-start gap-2 text-sm text-primary/90 italic break-words">
                    <ArrowRight size={13} className="mt-0.5 shrink-0 text-primary/60" />
                    {renderVal(afterValue(f))}
                  </p>
                </div>
              </div>
            ))}
            {acceptedCandidates.map((c) => (
              <div key={c.key} className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary"><Sparkles size={11} /> New attribute · {c.label}</span>
                </div>
                <p className="mt-2 flex items-start gap-2 text-sm text-primary/90 italic break-words">
                  <ArrowRight size={13} className="mt-0.5 shrink-0 text-primary/60" />
                  {renderVal(c.value)}
                </p>
              </div>
            ))}
            {accepted.length + acceptedCandidates.length === 0 && (
              <div className="rounded-xl border border-border/[0.08] bg-surface p-6 text-center text-sm text-muted-foreground/55">
                No accepted changes — nothing to sync.
              </div>
            )}
          </div>
        </div>

        {/* Health score impact + sync */}
        <div className="lg:sticky lg:top-4 self-start space-y-4">
          <div className="rounded-2xl border border-border/[0.1] bg-card p-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Health score impact</p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <div>
                <p className="font-serif text-5xl font-bold tabular-nums text-danger">{before}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/45">Before</p>
              </div>
              <ArrowRight size={22} className="text-muted-foreground/40" />
              <div>
                <p className="font-serif text-5xl font-bold tabular-nums text-success">{after}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/45">After</p>
              </div>
            </div>
            {delta > 0 && (
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                <CheckCircle2 size={13} /> +{delta} point improvement
              </p>
            )}
            {proposal.scoreAfter?.contentQuality != null && (
              <p className="mt-3 text-[11px] text-muted-foreground/55">
                Content quality{" "}
                <span className="font-bold text-foreground/80 tabular-nums">{Math.round(proposal.scoreAfter.contentQuality)}</span>
                <span className="text-muted-foreground/40">/100</span>
              </p>
            )}
          </div>

          <button
            onClick={() => void handleSync()}
            disabled={busy || accepted.length + acceptedCandidates.length === 0}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-b from-primary to-primary/85 text-primary-foreground text-sm font-bold uppercase tracking-wider shadow-lg shadow-primary/30 hover:brightness-110 active:translate-y-px transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            Sync to Catalog
          </button>
          <button onClick={onBack} className="w-full text-center text-[11px] uppercase tracking-wider text-muted-foreground/50 hover:text-foreground">← Back to drafts</button>
        </div>
      </div>
    </div>
  );
}
