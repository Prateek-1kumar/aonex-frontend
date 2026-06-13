"use client";

import { ChevronRight } from "lucide-react";

export interface CategoryBreadcrumbProps {
  /** " › "-separated path, e.g. "Fashion › Clothing › Jeans" */
  displayPath: string;
  /** Called with the 0-based segment index when a non-last segment is clicked */
  onSegmentClick?: (index: number) => void;
  className?: string;
}

export default function CategoryBreadcrumb({
  displayPath,
  onSegmentClick,
  className,
}: CategoryBreadcrumbProps) {
  if (!displayPath) return null;

  const segments = displayPath.split(" › ");

  return (
    <nav
      className={["flex items-center flex-wrap gap-0.5 text-sm", className ?? ""].join(" ").trim()}
      aria-label="Category breadcrumb"
    >
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;

        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && (
              <ChevronRight
                size={12}
                className="shrink-0 text-muted-foreground/50"
                aria-hidden
              />
            )}

            {isLast ? (
              // Last segment — emphasized
              <span className="text-foreground font-medium">{segment}</span>
            ) : onSegmentClick ? (
              // Clickable ancestor
              <button
                type="button"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => onSegmentClick(i)}
              >
                {segment}
              </button>
            ) : (
              // Plain ancestor (no handler)
              <span className="text-muted-foreground">{segment}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
