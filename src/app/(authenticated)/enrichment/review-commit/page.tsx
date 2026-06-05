"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Sparkles, ChevronRight,
} from "lucide-react";
import {
  api,
  type ProposalListItem,
  type EnrichmentProposalView,
} from "@/lib/api";
import { EnrichReviewDrawer } from "@/app/(authenticated)/catalog/components/EnrichReviewDrawer";

type Toast = { type: "success" | "error"; message: string } | null;

export default function ReviewCommitPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [open, setOpen] = useState<EnrichmentProposalView | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.enrich.list("ready");
      setProposals(res.proposals);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  async function openProposal(item: ProposalListItem) {
    setOpening(item.proposalId);
    try {
      const full = await api.enrich.get(item.productId, item.proposalId);
      if (full.status !== "ready") {
        showToast({ type: "error", message: `Proposal is ${full.status}` });
        await load();
        return;
      }
      setOpen(full);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="animate-in mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground/95">Review &amp; Commit</h1>
          <p className="mt-1 text-sm text-muted-foreground/65">
            Review each enriched draft, accept or reject changes, and commit to the catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/enrichment"
            className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover flex items-center gap-1.5"
          >
            Drafting Room
          </Link>
          <button
            onClick={() => void load()}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border/[0.08] bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60">
            <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Loading drafts…</span>
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground/55">No drafts ready to review.</p>
            <Link
              href="/enrichment"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Go to Drafting Room <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/[0.04]">
            {proposals.map((p) => {
              const before = Math.round(p.scoreBefore?.completeness ?? 0);
              const after = Math.round(p.scoreAfter?.completeness ?? 0);
              return (
                <button
                  key={p.proposalId}
                  onClick={() => void openProposal(p)}
                  disabled={opening !== null}
                  className="w-full grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 items-center text-left hover:bg-surface-hover transition-colors disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90 truncate">
                      {p.title ?? <span className="italic text-muted-foreground/50">Untitled product</span>}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/55">
                      <span className="uppercase tracking-wider">{p.archetype ?? "generic"}</span>
                      <span>· {p.fieldCount} fields</span>
                      {p.candidateCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Sparkles size={11} /> {p.candidateCount} new
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5">
                    <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{before}</span>
                    <ArrowRight size={12} className="text-muted-foreground/40" />
                    <span className="text-sm font-bold tabular-nums text-success">{after}</span>
                  </div>
                  {opening === p.proposalId ? (
                    <Loader2 size={15} className="animate-spin text-muted-foreground/50" />
                  ) : (
                    <ChevronRight size={15} className="text-muted-foreground/40" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <EnrichReviewDrawer
          productId={open.productId}
          proposal={open}
          onClose={() => setOpen(null)}
          onApplied={(score) => {
            setOpen(null);
            setProposals((prev) => prev.filter((x) => x.proposalId !== open.proposalId));
            showToast({ type: "success", message: `Committed · completeness now ${Math.round(score)}` });
          }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "bg-success/15 border-success/30 text-success" : "bg-danger/15 border-danger/30 text-danger"}`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
