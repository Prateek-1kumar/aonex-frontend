"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "@/lib/api";

const KPI = [
  { label: "SKUs Ingested",   value: "—", delta: null },
  { label: "Auto Approved",   value: "—", delta: null },
  { label: "In Review",       value: "—", delta: null },
  { label: "Rejected",        value: "—", delta: null },
  { label: "Channels Active", value: "—", delta: null },
  { label: "Sync Health",     value: "—", delta: null },
];

export default function DashboardPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api.listConnections()
      .then((conns) => {
        if (conns.length === 0) router.replace("/ingestion");
        else setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [router]);

  if (!checked) return null;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground">Command Dashboard</h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Executive Pulse
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/[0.1] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-border/20 transition-colors">
            <RefreshCw size={12} />
            Re-sync
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-6 gap-px rounded-xl overflow-hidden border border-border/[0.07] mb-8">
        {KPI.map((kpi, i) => (
          <div
            key={kpi.label}
            className="bg-card px-4 py-5 flex flex-col gap-2 animate-in"
            style={{ animationDelay: `${i * 55}ms`, animationFillMode: "both" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              {kpi.label}
            </p>
            <p className="font-serif text-2xl font-bold text-foreground tabular-nums">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-border/[0.07] bg-card p-10 flex flex-col items-center text-center">
        <p className="font-serif text-lg font-semibold text-foreground/80 mb-2">
          Your dashboard activates after first ingestion
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Connect a marketplace, upload a CSV, or paste a product URL to get started.
        </p>
        <a
          href="/ingestion"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold uppercase tracking-widest hover:bg-primary/15 transition-colors"
        >
          Go to Ingestion Terminal
          <ArrowUpRight size={13} />
        </a>
      </div>
    </div>
  );
}
