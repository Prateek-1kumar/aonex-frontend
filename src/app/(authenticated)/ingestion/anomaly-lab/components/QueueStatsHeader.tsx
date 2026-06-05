import type { QueueStats } from "../lib/lab-types";

interface QueueStatsHeaderProps {
  stats: QueueStats | null;
  /** Number of items currently shown in the list. */
  count: number;
}

export function QueueStatsHeader({ stats, count }: QueueStatsHeaderProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap px-5 py-3 rounded-2xl border border-border/[0.08] bg-card shadow-sm">
      {/* Count */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Awaiting Review
        </span>
        <span className="tabular-nums text-sm font-bold text-foreground/90">{count}</span>
      </div>

      {stats && (
        <>
          {/* byReason chips */}
          {Object.entries(stats.byReason).length > 0 && (
            <>
              <div className="h-4 w-px bg-border/[0.12] shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Reason
                </span>
                {Object.entries(stats.byReason).map(([reason, n]) => (
                  <span
                    key={reason}
                    className="px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20 text-warning text-[10px] font-semibold"
                  >
                    {reason} ×{n}
                  </span>
                ))}
              </div>
            </>
          )}

          {Object.entries(stats.bySource).length > 0 && (
            <>
              <div className="h-4 w-px bg-border/[0.12] shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Source
                </span>
                {Object.entries(stats.bySource).map(([src, n]) => (
                  <span
                    key={src}
                    className="px-1.5 py-0.5 rounded bg-surface border border-border/[0.08] text-muted-foreground/70 text-[10px] font-semibold"
                  >
                    {src} ×{n}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Age buckets */}
          <div className="h-4 w-px bg-border/[0.12] shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Age
            </span>
            {stats.byAge.today > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-success/10 border border-success/20 text-success text-[10px] font-semibold">
                Today ×{stats.byAge.today}
              </span>
            )}
            {stats.byAge.week > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-surface border border-border/[0.08] text-muted-foreground/70 text-[10px] font-semibold">
                Week ×{stats.byAge.week}
              </span>
            )}
            {stats.byAge.older > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-danger/10 border border-danger/20 text-danger text-[10px] font-semibold">
                Older ×{stats.byAge.older}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
