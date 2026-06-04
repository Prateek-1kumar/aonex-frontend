// Single source of truth for catalog-product status presentation, so the table
// badge and the detail-modal badge can never disagree on label or colour.
// Colours come only from semantic theme tokens (success/warning/danger).

interface StatusBadge {
  label: string;
  /** Tailwind classes for background / text / border. Sizing stays at the call site. */
  className: string;
}

const CATALOG_STATUS: Record<string, StatusBadge> = {
  active:   { label: "Active",   className: "bg-success/12 text-success border-success/25" },
  draft:    { label: "Draft",    className: "bg-warning/12 text-warning border-warning/25" },
  archived: { label: "Archived", className: "bg-danger/12 text-danger border-danger/25" },
};

/** Resolve a catalog product status to its badge label + colour classes. */
export function catalogStatusBadge(status: string): StatusBadge {
  return (
    CATALOG_STATUS[status] ?? {
      label: status,
      className: "bg-surface text-muted-foreground border-border/20",
    }
  );
}
