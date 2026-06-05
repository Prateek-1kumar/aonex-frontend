"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Wand2, Loader2, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Search,
} from "lucide-react";
import { api, type ProposalListItem } from "@/lib/api";
import type { ListCatalogProductRow } from "@/app/(authenticated)/catalog/lib/catalog-types";

type Toast = { type: "success" | "error"; message: string } | null;

const NEEDS_ENRICHMENT_BELOW = 100;

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
  const [products, setProducts] = useState<ListCatalogProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<ProposalListItem[]>([]);
  const [enqueuing, setEnqueuing] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.catalog.list({ limit: 200 });
      setProducts(res.products);
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await api.enrich.list();
      setDrafts(res.proposals);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => { void loadProducts(); void loadDrafts(); }, [loadProducts, loadDrafts]);

  // Poll drafts while any are in flight.
  const inFlight = useMemo(
    () => drafts.filter((d) => d.status === "pending" || d.status === "generating").length,
    [drafts]
  );
  const ready = useMemo(() => drafts.filter((d) => d.status === "ready").length, [drafts]);

  useEffect(() => {
    if (inFlight === 0) return;
    const t = setInterval(() => void loadDrafts(), 3000);
    return () => clearInterval(t);
  }, [inFlight, loadDrafts]);

  const needsEnrichment = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => health(p) < NEEDS_ENRICHMENT_BELOW)
      .filter((p) =>
        q === "" ||
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => health(a) - health(b));
  }, [products, search]);

  const activeProposalByProduct = useMemo(() => {
    const m = new Map<string, ProposalListItem>();
    for (const d of drafts) {
      if (d.status === "pending" || d.status === "generating" || d.status === "ready") {
        if (!m.has(d.productId)) m.set(d.productId, d);
      }
    }
    return m;
  }, [drafts]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === needsEnrichment.length ? new Set() : new Set(needsEnrichment.map((p) => p.id))
    );
  }

  async function enrichSelected() {
    if (selected.size === 0) return;
    setEnqueuing(true);
    try {
      const res = await api.enrich.bulk([...selected]);
      showToast({ type: "success", message: `Enriching ${res.jobs.length} product${res.jobs.length === 1 ? "" : "s"}…` });
      setSelected(new Set());
      await loadDrafts();
    } catch (e) {
      showToast({ type: "error", message: (e as Error).message });
    } finally {
      setEnqueuing(false);
    }
  }

  return (
    <div className="animate-in mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground/95">Drafting Room</h1>
          <p className="mt-1 text-sm text-muted-foreground/65">
            Select thin products and push them through AI enrichment. Review drafts on the Review Commit tab.
          </p>
        </div>
        <button
          onClick={() => { void loadProducts(); void loadDrafts(); }}
          className="px-3 py-1.5 rounded-lg bg-surface border border-border/[0.08] text-xs text-foreground/70 hover:bg-surface-hover flex items-center gap-1.5"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Draft status strip */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <StatChip label="In flight" value={inFlight} icon={<Loader2 size={13} className={inFlight ? "animate-spin" : ""} />} />
        <Link
          href="/enrichment/review-commit"
          className="group inline-flex items-center gap-2 rounded-lg border border-success/25 bg-success/[0.06] px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/15"
        >
          <CheckCircle2 size={13} /> {ready} ready to review
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-border/[0.08] bg-surface px-3 py-1.5">
            <Search size={13} className="text-muted-foreground/45" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or brand…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none w-56"
            />
          </label>
          <span className="text-xs text-muted-foreground/55">{needsEnrichment.length} need enrichment</span>
        </div>
        <button
          onClick={() => void enrichSelected()}
          disabled={selected.size === 0 || enqueuing}
          className="px-4 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-40 flex items-center gap-1.5"
        >
          {enqueuing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Enrich {selected.size > 0 ? selected.size : ""} selected
        </button>
      </div>

      {/* List */}
      <div className="mt-3 rounded-xl border border-border/[0.08] bg-card overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_120px_140px] gap-3 px-4 py-2.5 border-b border-border/[0.06] text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
          <button onClick={toggleAll} className="flex items-center justify-center" aria-label="Select all">
            <span className={`size-4 rounded border ${selected.size > 0 && selected.size === needsEnrichment.length ? "bg-primary border-primary" : "border-border/30"}`} />
          </button>
          <span>Product</span>
          <span>Score</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground/60">
            <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Loading catalog…</span>
          </div>
        ) : needsEnrichment.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground/55">
            Nothing needs enrichment. 🎉
          </div>
        ) : (
          <div className="divide-y divide-border/[0.04]">
            {needsEnrichment.map((p) => {
              const score = health(p);
              const draft = activeProposalByProduct.get(p.id);
              return (
                <div key={p.id} className="grid grid-cols-[40px_1fr_120px_140px] gap-3 px-4 py-3 items-center hover:bg-surface-hover transition-colors">
                  <button onClick={() => toggle(p.id)} className="flex items-center justify-center" aria-label="Select">
                    <span className={`size-4 rounded border ${selected.has(p.id) ? "bg-primary border-primary" : "border-border/30"}`} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90 truncate">{p.title ?? <span className="italic text-muted-foreground/50">Untitled</span>}</p>
                    <p className="text-[11px] text-muted-foreground/50 truncate">{p.brand ?? "—"}{p.category ? ` · ${p.category}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tabular-nums ${ringColor(score)}`}>{score}</span>
                    <span className="text-[10px] text-muted-foreground/40">/100</span>
                  </div>
                  <div>
                    {draft ? <DraftBadge status={draft.status} /> : <span className="text-[11px] text-muted-foreground/40">—</span>}
                  </div>
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

function StatChip({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border/[0.08] bg-surface px-3 py-1.5 text-xs text-foreground/70">
      <span className="text-muted-foreground/50">{icon}</span>
      <span className="font-bold tabular-nums">{value}</span>
      <span className="text-muted-foreground/55">{label}</span>
    </span>
  );
}

function DraftBadge({ status }: { status: ProposalListItem["status"] }) {
  const map: Record<ProposalListItem["status"], { label: string; cls: string }> = {
    pending: { label: "Queued", cls: "bg-surface text-muted-foreground/60 border-border/[0.1]" },
    generating: { label: "Generating", cls: "bg-primary/12 text-primary border-primary/25" },
    ready: { label: "Ready", cls: "bg-success/12 text-success border-success/25" },
    applied: { label: "Applied", cls: "bg-success/12 text-success border-success/25" },
    rejected: { label: "Rejected", cls: "bg-surface text-muted-foreground/50 border-border/[0.1]" },
    failed: { label: "Failed", cls: "bg-danger/12 text-danger border-danger/25" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
      {status === "generating" && <Loader2 size={10} className="animate-spin" />}
      {s.label}
    </span>
  );
}
