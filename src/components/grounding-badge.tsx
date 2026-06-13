"use client";

import { ShieldCheck, ShieldAlert, HelpCircle, AlertTriangle, ShieldX } from "lucide-react";

export interface GroundingBadgeProps {
  /** "grounded" | "weak" | "inferred" | "unverified" | "contradicted" */
  grounding: string;
  /** 0..1 — when present, shown as "· 82%" */
  support?: number | undefined;
  className?: string;
}

interface GroundingSpec {
  label: string;
  colorClasses: string;
  Icon: React.ElementType;
}

const GROUNDING_MAP: Record<string, GroundingSpec> = {
  grounded: {
    label: "Grounded",
    colorClasses: "text-success bg-success/10",
    Icon: ShieldCheck,
  },
  weak: {
    label: "Weak",
    colorClasses: "text-warning bg-warning/10",
    Icon: ShieldAlert,
  },
  inferred: {
    label: "Inferred",
    colorClasses: "text-muted-foreground bg-surface",
    Icon: HelpCircle,
  },
  unverified: {
    label: "Unverified",
    colorClasses: "text-danger/80 bg-danger/[0.06]",
    Icon: ShieldX,
  },
  contradicted: {
    label: "Contradicted",
    colorClasses: "text-danger bg-danger/10",
    Icon: AlertTriangle,
  },
};

const FALLBACK: GroundingSpec = {
  label: "Unknown",
  colorClasses: "text-muted-foreground bg-surface",
  Icon: HelpCircle,
};

/** Left-edge / background tone for a field row, keyed on grounding — kept in sync
 *  with the badge palette so the row treatment and the badge always agree. */
export function groundingTone(grounding: string): string {
  switch (grounding) {
    case "grounded": return "border-l-success/60";
    case "weak": return "border-l-warning/60";
    case "inferred": return "border-l-muted-foreground/30";
    case "unverified": return "border-l-danger/50";
    case "contradicted": return "border-l-danger";
    default: return "border-l-border/40";
  }
}

export default function GroundingBadge({ grounding, support, className }: GroundingBadgeProps) {
  const spec = GROUNDING_MAP[grounding] ?? FALLBACK;
  const { label, colorClasses, Icon } = spec;

  // Round support to nearest integer percent
  const supportPct = support !== undefined ? Math.round(support * 100) : null;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        colorClasses,
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <Icon size={11} aria-hidden />
      {label}
      {supportPct !== null && (
        <span className="opacity-70">&middot; {supportPct}%</span>
      )}
    </span>
  );
}
