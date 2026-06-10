"use client";

import { ShieldCheck, ShieldAlert, HelpCircle, AlertTriangle } from "lucide-react";

export interface GroundingBadgeProps {
  /** "grounded" | "weak" | "inferred" | "contradicted" */
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
