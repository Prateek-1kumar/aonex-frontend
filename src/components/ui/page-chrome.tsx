"use client";

import type { ReactNode } from "react";

/**
 * Shared premium page chrome — used across Ingestion, Catalog and Enrichment so
 * every section opens with the same elevated, brand-lit header treatment.
 *
 * Pure Tailwind (incl. arbitrary token values) — no bespoke global CSS. All
 * colour resolves from semantic theme tokens, so light + dark both work:
 *   • aura / accent rule → hsl(var(--primary))
 *   • grid texture       → hsl(var(--foreground)) alpha (inverts with theme)
 *   • depth              → Tailwind shadow utilities (black-based, both themes)
 */
export function PageHero({
  icon,
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative mb-7 overflow-hidden rounded-2xl border border-border/[0.08] bg-card shadow-lg">
      {/* brand aura */}
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.45),transparent_70%)] opacity-60 blur-2xl" />
      {/* grid texture, faded toward the bottom */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[linear-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      {/* top accent hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.5),transparent)]" />

      <div className="relative px-6 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            {icon && (
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,hsl(var(--primary)/0.55),transparent_70%)] opacity-70 blur-md" />
                <div className="relative grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/12 text-primary shadow-sm">
                  {icon}
                </div>
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-primary/80">
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-1 font-serif text-3xl font-bold leading-none text-foreground sm:text-4xl">
                {title}
              </h1>
              {description && (
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

type StatTone = "primary" | "success" | "warning" | "danger" | "muted";

const STAT_TONE: Record<StatTone, { tile: string; value: string }> = {
  primary: { tile: "border-primary/20 bg-primary/10 text-primary", value: "text-foreground" },
  success: { tile: "border-success/20 bg-success/10 text-success", value: "text-success" },
  warning: { tile: "border-warning/20 bg-warning/10 text-warning", value: "text-warning" },
  danger:  { tile: "border-danger/20 bg-danger/10 text-danger",   value: "text-danger" },
  muted:   { tile: "border-border/[0.1] bg-surface text-muted-foreground/70", value: "text-foreground/90" },
};

/** Compact KPI card — icon tile + big number + label. */
export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "muted",
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
}) {
  const t = STAT_TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/[0.08] bg-card px-3.5 py-3 shadow-sm">
      {icon && (
        <div className={`grid size-9 shrink-0 place-items-center rounded-lg border ${t.tile}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/55">
          {label}
        </p>
        <p className={`mt-0.5 text-lg font-bold leading-none tabular-nums ${t.value}`}>
          {value}
          {hint && <span className="ml-1 text-[11px] font-medium text-muted-foreground/50">{hint}</span>}
        </p>
      </div>
    </div>
  );
}
