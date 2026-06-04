// Single source of truth for catalog-product status presentation, so the table
// badge and the detail-modal badge can never disagree on label or colour.

interface StatusBadge {
  label: string;
  /** Tailwind classes for background / text / border. Sizing stays at the call site. */
  className: string;
}

const CATALOG_STATUS: Record<string, StatusBadge> = {
  active:   { label: "Active",   className: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
  draft:    { label: "Draft",    className: "bg-amber-500/12 text-amber-300 border-amber-500/25" },
  archived: { label: "Archived", className: "bg-rose-500/12 text-rose-300 border-rose-500/25" },
};

/** Resolve a catalog product status to its badge label + colour classes. */
export function catalogStatusBadge(status: string): StatusBadge {
  return (
    CATALOG_STATUS[status] ?? {
      label: status,
      className: "bg-white/[0.05] text-foreground/60 border-border/20",
    }
  );
}
