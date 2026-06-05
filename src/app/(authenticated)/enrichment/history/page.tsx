"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, RefreshCw, ArrowRight, History as HistoryIcon, ExternalLink, Undo2,
  CheckCircle2, AlertCircle, TrendingUp,
} from "lucide-react";
import { api, type ProposalListItem } from "@/lib/api";
import { PageHero, StatCard } from "@/components/ui/page-chrome";
import { loadCatalogTitles } from "@/lib/catalog-titles";

type Toast = { type: "success" | "error"; message: string } | null;

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const handleRevert = useCallback(
    async (item: ProposalListItem) => {
      setReverting(item.proposalId);
      try {
        await api.enrich.revert(item.productId, item.proposalId);
        setItems((prev) => prev.filter((x) => x.proposalId !== item.proposalId));
        showToast({ type: "success", message: "Reverted — catalog restored" });
      } catch (e) {
        showToast({ type: "error", message: (e as Error).message });
      } finally {
        setReverting(null);
      }
    },
    [showToast]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.enrich.list({ status: "applied" });
      setItems(res.proposals);
    } catch {
      /* surfaced via empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadCatalogTitles().then(setTitles).catch(() => {}); }, []);

  const titleOf = useCallback(
    (p: ProposalListItem) => p.title ?? titles.get(p.productId) ?? null,
    [titles]
  );

  const kpis = useMemo(() => {
    let uplift = 0;
    for (const p of items) {
      uplift += Math.round(p.scoreAfter?.completeness ?? 0) - Math.round(p.scoreBefore?.completeness ?? 0);
    }
    return { synced: items.length, avgUplift: items.length ? Math.round(uplift / items.length) : 0 };
  }, [items]);

  return (
    <div className="animate-in w-full">
      <PageHero
        icon={<HistoryIcon size={22} strokeWidth={1.6} />}
        eyebrow="Enrichment"
        title="History"
        description="Enrichments that have been synced to the catalog. Revert any sync to restore the previous values."
        actions={
          <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover hover:text-foreground transition-colors flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      >
        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <StatCard icon={<CheckCircle2 size={16} />} label="Synced" value={kpis.synced} tone="success" />
          <StatCard icon={<TrendingUp size={16} />} label="Avg Uplift" value={`+${kpis.avgUplift}`} hint="pts" tone="primary" />
        </div>
      </PageHero>

      <div className="rounded-2xl border border-border/[0.08] bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="relative mx-auto mb-4 w-fit">
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--primary)/0.35),transparent_70%)] opacity-50 blur-lg" />
              <div className="relative grid size-14 place-items-center rounded-2xl border border-border/[0.1] bg-surface text-muted-foreground/40">
                <HistoryIcon size={24} strokeWidth={1.5} />
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground/55">Nothing synced yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/[0.04]">
            {items.map((p) => {
              const before = Math.round(p.scoreBefore?.completeness ?? 0);
              const after = Math.round(p.scoreAfter?.completeness ?? 0);
              return (
                <div key={p.proposalId} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3.5 items-center hover:bg-surface-hover transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground/90 truncate">{titleOf(p) ?? <span className="italic text-muted-foreground/50">Untitled product</span>}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/55 uppercase tracking-wider">{p.archetype ?? "generic"} · {p.fieldCount} fields</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5">
                    <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{before}</span>
                    <ArrowRight size={12} className="text-muted-foreground/40" />
                    <span className="text-sm font-bold tabular-nums text-success">{after}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/45 tabular-nums w-28 text-right">{fmt(p.updatedAt)}</span>
                  <button
                    onClick={() => void handleRevert(p)}
                    disabled={reverting !== null}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-[11px] font-semibold text-foreground/60 hover:bg-danger/10 hover:text-danger disabled:opacity-40 flex items-center gap-1.5"
                    title="Undo this enrichment"
                  >
                    {reverting === p.proposalId ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                    Revert
                  </button>
                  <Link href={`/catalog?id=${encodeURIComponent(p.productId)}`} className="text-muted-foreground/50 hover:text-primary" title="View in catalog">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toast.type === "success" ? "bg-success/15 border-success/30 text-success" : "bg-danger/15 border-danger/30 text-danger"}`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
