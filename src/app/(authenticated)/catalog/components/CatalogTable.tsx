"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ListCatalogProductRow } from "../lib/catalog-types";

export type SortKey = "completeness" | "content" | "grounding" | "attrs" | "title" | "status";
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const COLS = "grid-cols-[minmax(0,1fr)_92px_120px_120px_96px_132px]";

function toneFor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground/40";
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}
function barFor(score: number | null | undefined): string {
  if (score == null) return "bg-foreground/10";
  if (score >= 80) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-danger";
}

/** score + thin bar cell. */
function ScoreCell({ value }: { value: number | null | undefined }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs font-bold tabular-nums ${toneFor(value)}`}>{value == null ? "—" : Math.round(value)}</span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
        <span className={`block h-full rounded-full ${barFor(value)}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

const DOTS: { key: keyof NonNullable<ListCatalogProductRow["provenance"]>; cls: string; title: string }[] = [
  { key: "grounded", cls: "bg-success", title: "grounded" },
  { key: "weak", cls: "bg-warning", title: "weak" },
  { key: "inferred", cls: "bg-muted-foreground/40", title: "inferred" },
  { key: "unverified", cls: "bg-danger/60", title: "unverified" },
  { key: "contradicted", cls: "bg-danger", title: "contradicted" },
];

function ProvenanceCell({ p }: { p: ListCatalogProductRow["provenance"] }) {
  if (!p) return <span className="text-xs text-muted-foreground/40">—</span>;
  return (
    <div className="flex items-center gap-1.5" title={DOTS.map((d) => `${d.title}: ${p[d.key]}`).join("  ·  ")}>
      {DOTS.filter((d) => p[d.key] > 0).map((d) => (
        <span key={d.key} className="inline-flex items-center gap-0.5">
          <span className={`size-2 rounded-full ${d.cls}`} />
          <span className="text-[10px] tabular-nums text-muted-foreground/70">{p[d.key]}</span>
        </span>
      ))}
      {DOTS.every((d) => p[d.key] === 0) && <span className="text-xs text-muted-foreground/40">—</span>}
    </div>
  );
}

function HeaderCell({
  label,
  k,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  k?: SortKey;
  sort: SortState | null;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  if (!k) return <span className={align === "right" ? "text-right" : ""}>{label}</span>;
  const active = sort?.key === k;
  const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(k)}
      className={`group inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""} ${active ? "text-foreground" : "hover:text-foreground/80"}`}
    >
      {label}
      <Icon size={11} className={active ? "text-primary" : "opacity-40 group-hover:opacity-70"} />
    </button>
  );
}

const STATUS_TONE: Record<string, string> = {
  draft: "text-warning bg-warning/10",
  ready: "text-primary bg-primary/10",
  applied: "text-success bg-success/10",
  active: "text-success bg-success/10",
};

export function CatalogTable({
  products,
  sort,
  onSort,
  onRowClick,
}: {
  products: ListCatalogProductRow[];
  sort: SortState | null;
  onSort: (k: SortKey) => void;
  onRowClick: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/[0.08] bg-card shadow-sm">
      <div className="min-w-[760px]">
        {/* Header */}
        <div
          className={`grid ${COLS} gap-3 border-b border-border/[0.06] bg-gradient-to-b from-surface/40 to-transparent px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55`}
        >
          <HeaderCell label="Product" k="title" sort={sort} onSort={onSort} />
          <HeaderCell label="Status" k="status" sort={sort} onSort={onSort} />
          <HeaderCell label="Completeness" k="completeness" sort={sort} onSort={onSort} />
          <HeaderCell label="Content" k="content" sort={sort} onSort={onSort} />
          <HeaderCell label="Grounding" k="grounding" sort={sort} onSort={onSort} />
          <HeaderCell label="Provenance · attrs" k="attrs" sort={sort} onSort={onSort} />
        </div>

        {/* Rows */}
        {products.map((p) => {
          const statusCls = STATUS_TONE[p.status] ?? "text-muted-foreground bg-foreground/[0.06]";
          return (
            <button
              key={p.id}
              onClick={() => onRowClick(p.id)}
              className={`grid ${COLS} w-full items-center gap-3 border-b border-border/[0.04] px-4 py-3 text-left transition-colors hover:bg-surface/50`}
            >
              {/* Product */}
              <div className="min-w-0">
                {p.brand && (
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/55">{p.brand}</p>
                )}
                <p className="truncate text-sm font-medium text-foreground/90">{p.title ?? "Untitled"}</p>
                {p.categoryPath && <p className="truncate text-[11px] text-muted-foreground/50">{p.categoryPath}</p>}
              </div>
              {/* Status */}
              <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCls}`}>
                {p.status}
              </span>
              {/* Completeness */}
              <ScoreCell value={p.completenessScore} />
              {/* Content */}
              <ScoreCell value={p.contentQualityScore} />
              {/* Grounding */}
              <span className={`text-xs font-bold tabular-nums ${p.groundingRate == null ? "text-muted-foreground/40" : p.groundingRate >= 0.9 ? "text-success" : p.groundingRate >= 0.7 ? "text-warning" : "text-danger"}`}>
                {p.groundingRate == null ? "—" : `${Math.round(p.groundingRate * 100)}%`}
              </span>
              {/* Provenance + attrs */}
              <div className="flex flex-col gap-1">
                <ProvenanceCell p={p.provenance} />
                {p.attrsTotal != null && p.attrsTotal > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground/55">
                    {p.attrsFilled ?? 0}/{p.attrsTotal} attrs
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
