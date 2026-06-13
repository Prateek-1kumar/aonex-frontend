"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Target, Anchor, TrendingUp, AlertTriangle, Boxes, ClipboardCheck, Loader2, RefreshCw, ArrowLeft,
} from "lucide-react";
import { api, type CatalogQualityReport } from "@/lib/api";
import { PageHero, StatCard } from "@/components/ui/page-chrome";

const pct = (x: number | null | undefined): string => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const score = (x: number | null | undefined): string => (x == null ? "—" : x.toFixed(1));
const signed = (x: number | null | undefined): string => (x == null ? "—" : `${x >= 0 ? "+" : ""}${x.toFixed(1)}`);

export default function CatalogQualityPage() {
  const [report, setReport] = useState<CatalogQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.quality.catalog());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quality report");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const cat = report?.categorization ?? null;
  const reg = report?.regression ?? null;
  const c = report?.catalog;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHero
        icon={<ShieldCheck size={22} />}
        eyebrow="Enrichment"
        title="Catalog Quality"
        description="Is enrichment actually working? Categorization and attribute accuracy are measured against the human-verified golden set; completeness and grounding are aggregated live across this workspace."
        actions={
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/[0.12] bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      >
        <Link href="/enrichment" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary/80 hover:text-primary">
          <ArrowLeft size={13} /> Back to Drafting Room
        </Link>
      </PageHero>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="animate-spin" size={18} /> Loading quality report…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {!loading && !error && report && (
        <div className="space-y-8">
          {/* Measured on the golden set — the credibility headline. */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
                Measured on golden set
              </h2>
              {report.model && (
                <span className="text-[11px] text-muted-foreground/50">
                  {report.model}
                  {report.asOf ? ` · ${new Date(report.asOf).toLocaleString()}` : ""}
                </span>
              )}
            </div>

            {cat ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard icon={<Target size={16} />} tone="primary" label="Categorization precision" value={pct(cat.precision)} hint="right when committed" />
                <StatCard icon={<Target size={16} />} tone="primary" label="Categorization recall" value={pct(cat.recall)} hint={`top-1 ${pct(cat.top1)}`} />
                <StatCard icon={<Anchor size={16} />} tone="success" label="Grounding rate" value={pct(report.groundingRate)} hint="auto-applied" />
                <StatCard icon={<TrendingUp size={16} />} tone="success" label="Completeness lift" value={signed(report.completenessLift)} hint="vs before" />
                <StatCard
                  icon={<AlertTriangle size={16} />}
                  tone={reg && reg.count > 0 ? "danger" : "muted"}
                  label="Regressions"
                  value={reg ? reg.count : "—"}
                  hint={reg?.sinceLabel ? `vs ${reg.sinceLabel}` : reg ? "vs last run" : "no prior run"}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border/[0.1] bg-surface px-4 py-6 text-sm text-muted-foreground">
                No eval run has been persisted yet. Run{" "}
                <code className="rounded bg-card px-1.5 py-0.5 text-xs">bun run eval:enrich --persist --label &lt;tag&gt;</code>{" "}
                against the golden set to populate the measured headline + regression count.
              </div>
            )}
            {report.goldAttrAccuracy != null && cat && (
              <p className="mt-2 text-[11px] text-muted-foreground/55">
                Attribute-extraction accuracy vs gold values: <span className="font-semibold text-foreground/80">{pct(report.goldAttrAccuracy)}</span>
              </p>
            )}
          </section>

          {/* Live workspace aggregates from the products' latest proposals. */}
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">This workspace</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                icon={<Boxes size={16} />}
                label="Products enriched"
                value={c ? `${c.enrichedProducts}` : "—"}
                hint={c ? `of ${c.totalProducts}` : undefined}
              />
              <StatCard icon={<TrendingUp size={16} />} tone="success" label="Avg completeness" value={score(c?.avgCompleteness)} hint="/ 100" />
              <StatCard icon={<Anchor size={16} />} tone="success" label="Avg grounding" value={pct(c?.avgGrounding)} />
              <StatCard icon={<Boxes size={16} />} label="Avg content quality" value={score(c?.avgContentQuality)} hint="/ 100" />
              <StatCard
                icon={<ClipboardCheck size={16} />}
                tone={c && c.pendingReview > 0 ? "warning" : "muted"}
                label="Pending review"
                value={c ? c.pendingReview : "—"}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
