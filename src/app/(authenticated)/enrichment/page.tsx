"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Wand2, Loader2, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Search, Plus, X, Sparkles, Layers,
} from "lucide-react";
import {
  api,
  pollEnrichmentProposal,
  type ProposalListItem,
  type EnrichmentProposalView,
} from "@/lib/api";
import type { ListCatalogProductRow } from "@/app/(authenticated)/catalog/lib/catalog-types";
import { EnrichReviewDrawer } from "@/app/(authenticated)/catalog/components/EnrichReviewDrawer";
import { PageHero, StatCard } from "@/components/ui/page-chrome";
import { loadCatalogTitles } from "@/lib/catalog-titles";
import CategoryBreadcrumb from "@/components/category-breadcrumb";
import { useCategoryPaths } from "@/app/(authenticated)/enrichment/lib/category-paths";

type Toast = { type: "success" | "error"; message: string } | null;
const STAGED = new Set(["pending", "generating", "ready"]);

function health(p: ListCatalogProductRow): number {
  if (p.completenessScore != null) return Math.round(p.completenessScore);
  let s = 0;
  if (p.title) s += 20;
  if (p.brand) s += 20;
  if (p.category) s += 20;
  if (p.gtin) s += 20;
  if (p.pricing?.amount) s += 20;
  return s;
}
function ringColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

export default function DraftingRoomPage() {
  const [drafts, setDrafts] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<EnrichmentProposalView | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  // Resolves "Untitled" rows: freshly-pushed proposals carry title:null, so we
  // fall back to the real product title from the catalog.
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { resolve: resolvePath } = useCategoryPaths();

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await api.enrich.list({ reviewed: false });
      setDrafts(res.proposals.filter((p) => STAGED.has(p.status)));
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadDrafts(); }, [loadDrafts]);
  useEffect(() => { void loadCatalogTitles().then(setTitles).catch(() => {}); }, []);

  const titleOf = useCallback(
    (d: ProposalListItem) => d.title ?? titles.get(d.productId) ?? null,
    [titles]
  );

  const inFlight = useMemo(
    () => drafts.filter((d) => d.status === "pending" || d.status === "generating").length,
    [drafts]
  );
  const readyCount = useMemo(() => drafts.filter((d) => d.status === "ready").length, [drafts]);

  // Poll while anything is generating.
  useEffect(() => {
    const generating = drafts.some((d) => d.status === "generating");
    if (!generating) return;
    const t = setInterval(() => void loadDrafts(), 3000);
    return () => clearInterval(t);
  }, [drafts, loadDrafts]);

  const stagedProductIds = useMemo(() => new Set(drafts.map((d) => d.productId)), [drafts]);

  async function handleEnrich(draft: ProposalListItem) {
    setEnriching(draft.proposalId);
    try {
      if (draft.status === "pending") {
        await api.enrich.run(draft.proposalId);
        setDrafts((prev) =>
          prev.map((d) => (d.proposalId === draft.proposalId ? { ...d, status: "generating" } : d))
        );
      }
      const proposal = await pollEnrichmentProposal(draft.productId, draft.proposalId);
      if (proposal.status === "ready") {
        setDrawer(proposal);
      } else {
        showToast({
          type: "error",
          message: proposal.status === "failed" ? proposal.reasoning ?? "Enrichment failed" : `Draft ${proposal.status}`,
        });
        await loadDrafts();
      }
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setEnriching(null);
    }
  }

  async function handlePush(ids: string[]) {
    try {
      const res = await api.enrich.push(ids);
      showToast({ type: "success", message: `Pushed ${res.drafts.length} product${res.drafts.length === 1 ? "" : "s"} to the Drafting Room` });
      setPickerOpen(false);
      await loadDrafts();
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    }
  }

  return (
    <div className="animate-in w-full">
      <PageHero
        icon={<Wand2 size={22} strokeWidth={1.6} />}
        eyebrow="Enrichment"
        title="Drafting Room"
        description="Push products here, then enrich each one to generate a richer schema. Reviewed drafts move to Review Commit."
        actions={
          <>
            <button
              onClick={() => setPickerOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-primary to-primary/85 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25 hover:brightness-110 active:translate-y-px transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Push products
            </button>
            <button
              onClick={() => void loadDrafts()}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </>
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={<Layers size={16} />} label="Staged" value={drafts.length} tone="primary" />
          <StatCard icon={<Loader2 size={16} className={inFlight ? "animate-spin" : ""} />} label="In Flight" value={inFlight} tone="warning" />
          <StatCard icon={<Sparkles size={16} />} label="Ready" value={readyCount} tone="success" />
        </div>
      </PageHero>

      <div className="mb-4 flex justify-end">
        <Link
          href="/enrichment/review-commit"
          className="group inline-flex items-center gap-2 rounded-lg border border-success/25 bg-success/[0.06] px-3.5 py-2 text-xs font-semibold text-success hover:bg-success/15 transition-colors"
        >
          <CheckCircle2 size={14} /> Continue to Review Commit
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="rounded-2xl border border-border/[0.08] bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_130px_150px] gap-3 px-4 py-3 border-b border-border/[0.06] bg-gradient-to-b from-surface/40 to-transparent text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
          <span>Product</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60">
            <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Loading drafts…</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="relative mx-auto mb-5 w-fit">
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--primary)/0.4),transparent_70%)] opacity-50 blur-lg" />
              <div className="relative grid size-14 place-items-center rounded-2xl border border-border/[0.1] bg-surface text-muted-foreground/45">
                <Wand2 size={24} strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground/60">Your Drafting Room is empty.</p>
            <button onClick={() => setPickerOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              <Plus size={13} /> Push products to enrich
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/[0.04]">
            {drafts.map((d) => (
              <div key={d.proposalId} className="grid grid-cols-[1fr_130px_150px] gap-3 px-4 py-3.5 items-center hover:bg-surface-hover transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/90 truncate">
                    {titleOf(d) ?? <span className="italic text-muted-foreground/50">Untitled product</span>}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/55">
                    {d.archetype && (
                      <CategoryBreadcrumb
                        displayPath={resolvePath(d.archetype)}
                        className="text-[11px] text-muted-foreground/55"
                      />
                    )}
                    {d.status === "ready" && (
                      <>
                        <span>· {d.fieldCount} fields</span>
                        {d.candidateCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-primary"><Sparkles size={11} /> {d.candidateCount}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div><DraftBadge status={d.status} /></div>
                <div className="flex justify-end">
                  <button
                    onClick={() => void handleEnrich(d)}
                    disabled={enriching !== null && enriching !== d.proposalId}
                    className={[
                      "px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40",
                      d.status === "ready"
                        ? "bg-success/15 border-success/30 text-success hover:bg-success/25"
                        : "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25",
                    ].join(" ")}
                  >
                    {enriching === d.proposalId ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Wand2 size={13} />
                    )}
                    {enriching === d.proposalId
                      ? "Working…"
                      : d.status === "ready"
                        ? "Review"
                        : "Enrich"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <PushPicker
          stagedProductIds={stagedProductIds}
          onClose={() => setPickerOpen(false)}
          onPush={handlePush}
        />
      )}

      {drawer && (
        <EnrichReviewDrawer
          productId={drawer.productId}
          proposal={drawer}
          commitLabel="Send to Review Commit"
          onClose={() => setDrawer(null)}
          onCommit={async (decisions) => {
            await api.enrich.review(drawer.productId, drawer.proposalId, decisions);
            showToast({ type: "success", message: "Sent to Review Commit" });
            await loadDrafts();
          }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[120] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "bg-success/15 border-success/30 text-success" : "bg-danger/15 border-danger/30 text-danger"}`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function DraftBadge({ status }: { status: ProposalListItem["status"] }) {
  const map: Record<ProposalListItem["status"], { label: string; cls: string; spin?: boolean }> = {
    pending: { label: "Staged", cls: "bg-surface text-muted-foreground/60 border-border/[0.1]" },
    generating: { label: "Generating", cls: "bg-primary/12 text-primary border-primary/25", spin: true },
    ready: { label: "Ready", cls: "bg-success/12 text-success border-success/25" },
    applied: { label: "Synced", cls: "bg-success/12 text-success border-success/25" },
    rejected: { label: "Rejected", cls: "bg-surface text-muted-foreground/50 border-border/[0.1]" },
    failed: { label: "Failed", cls: "bg-danger/12 text-danger border-danger/25" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
      {s.spin && <Loader2 size={10} className="animate-spin" />}
      {s.label}
    </span>
  );
}

// ── Push picker ──────────────────────────────────────────────────────────────

function PushPicker({
  stagedProductIds, onClose, onPush,
}: {
  stagedProductIds: Set<string>;
  onClose: () => void;
  onPush: (ids: string[]) => Promise<void>;
}) {
  const [products, setProducts] = useState<ListCatalogProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.catalog.list({ limit: 200 })
      .then((res) => { if (!cancelled) setProducts(res.products); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !stagedProductIds.has(p.id) && health(p) < 100)
      .filter((p) => q === "" || (p.title ?? "").toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q))
      .sort((a, b) => health(a) - health(b));
  }, [products, stagedProductIds, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-overlay/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-border/[0.1] bg-card shadow-2xl animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border/[0.06] bg-card/95 backdrop-blur rounded-t-2xl overflow-hidden">
          <div className="pointer-events-none absolute -left-8 -top-12 size-44 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.3),transparent_70%)] opacity-50 blur-2xl" />
          <h2 className="relative font-serif text-lg font-bold text-foreground/95">Push products to enrich</h2>
          <button onClick={onClose} className="relative size-8 rounded-lg bg-surface border border-border/[0.08] text-foreground/70 hover:bg-surface-hover hover:text-foreground flex items-center justify-center transition-colors"><X size={14} /></button>
        </div>
        <div className="px-5 py-3 border-b border-border/[0.06]">
          <label className="flex items-center gap-2 rounded-lg border border-border/[0.08] bg-surface px-3 py-1.5">
            <Search size={13} className="text-muted-foreground/45" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by title or brand…" className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none w-full" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60"><Loader2 size={16} className="animate-spin" /> Loading…</div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground/55">No more products to push.</div>
          ) : (
            <div className="divide-y divide-border/[0.04]">
              {candidates.map((p) => {
                const score = health(p);
                return (
                  <button key={p.id} onClick={() => toggle(p.id)} className="w-full grid grid-cols-[24px_1fr_70px] gap-3 px-5 py-2.5 items-center text-left hover:bg-surface-hover transition-colors">
                    <span className={`size-4 rounded border ${selected.has(p.id) ? "bg-primary border-primary" : "border-border/30"}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground/90 truncate">{p.title ?? "Untitled"}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{p.brand ?? "—"}{p.category ? ` · ${p.category}` : ""}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums text-right ${ringColor(score)}`}>{score}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border/[0.06] bg-card/95 backdrop-blur rounded-b-2xl">
          <span className="text-[11px] text-muted-foreground/55">{selected.size} selected</span>
          <button
            onClick={async () => { setBusy(true); try { await onPush([...selected]); } finally { setBusy(false); } }}
            disabled={selected.size === 0 || busy}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-primary to-primary/85 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25 hover:brightness-110 active:translate-y-px transition-all disabled:opacity-40 disabled:shadow-none flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Push {selected.size > 0 ? selected.size : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
