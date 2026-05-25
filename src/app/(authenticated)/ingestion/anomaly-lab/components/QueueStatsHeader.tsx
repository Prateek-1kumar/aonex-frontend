import type { QueueStats } from "../lib/lab-types";

interface QueueStatsHeaderProps {
  stats: QueueStats | null;
  position: number;
  total: number;
}

export function QueueStatsHeader({ stats, position, total }: QueueStatsHeaderProps) {
  const pct = total > 0 ? Math.round((position / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 flex-wrap px-5 py-3 rounded-xl border border-border/[0.08] bg-card">
      {/* Progress */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Queue
        </span>
        <span className="tabular-nums text-sm font-bold text-foreground/90">
          {position} <span className="text-muted-foreground/40 font-normal">/</span> {total}
        </span>
        {total > 0 && (
          <div className="w-20 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {stats && (
        <>
          <div className="h-4 w-px bg-border/[0.12] shrink-0" />

          {/* byReason chips */}
          {Object.entries(stats.byReason).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Reason
              </span>
              {Object.entries(stats.byReason).map(([reason, count]) => (
                <span
                  key={reason}
                  className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-[10px] font-semibold"
                >
                  {reason} ×{count}
                </span>
              ))}
            </div>
          )}

          {Object.entries(stats.bySource).length > 0 && (
            <>
              <div className="h-4 w-px bg-border/[0.12] shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Source
                </span>
                {Object.entries(stats.bySource).map(([src, count]) => (
                  <span
                    key={src}
                    className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-border/[0.08] text-muted-foreground/70 text-[10px] font-semibold"
                  >
                    {src} ×{count}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="h-4 w-px bg-border/[0.12] shrink-0" />

          {/* Age buckets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Age
            </span>
            {stats.byAge.today > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/80 text-[10px] font-semibold">
                Today ×{stats.byAge.today}
              </span>
            )}
            {stats.byAge.week > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-border/[0.08] text-muted-foreground/70 text-[10px] font-semibold">
                Week ×{stats.byAge.week}
              </span>
            )}
            {stats.byAge.older > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-300/70 text-[10px] font-semibold">
                Older ×{stats.byAge.older}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
