"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ArrowRight, History as HistoryIcon, ExternalLink } from "lucide-react";
import { api, type ProposalListItem } from "@/lib/api";

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

  return (
    <div className="animate-in mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground/95">History</h1>
          <p className="mt-1 text-sm text-muted-foreground/65">Enrichments that have been synced to the catalog.</p>
        </div>
        <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-border/[0.08] bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <HistoryIcon size={28} className="mx-auto text-muted-foreground/25" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-muted-foreground/55">Nothing synced yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/[0.04]">
            {items.map((p) => {
              const before = Math.round(p.scoreBefore?.completeness ?? 0);
              const after = Math.round(p.scoreAfter?.completeness ?? 0);
              return (
                <div key={p.proposalId} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90 truncate">{p.title ?? <span className="italic text-muted-foreground/50">Untitled product</span>}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/55 uppercase tracking-wider">{p.archetype ?? "generic"} · {p.fieldCount} fields</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/[0.08] bg-surface px-2.5 py-1.5">
                    <span className="text-sm font-bold tabular-nums text-muted-foreground/60">{before}</span>
                    <ArrowRight size={12} className="text-muted-foreground/40" />
                    <span className="text-sm font-bold tabular-nums text-success">{after}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/45 tabular-nums w-28 text-right">{fmt(p.updatedAt)}</span>
                  <Link href={`/catalog?id=${encodeURIComponent(p.productId)}`} className="text-muted-foreground/50 hover:text-primary" title="View in catalog">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
