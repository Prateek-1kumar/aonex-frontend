import { Link2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { MatchCandidate } from "../lib/lab-types";

interface MatchCandidateBannerProps {
  candidates: MatchCandidate[];
  onLink: (productId: string) => void;
  busy: boolean;
}

export function MatchCandidateBanner({ candidates, onLink, busy }: MatchCandidateBannerProps) {
  const liveCandidates = candidates.filter((c) => c.kind === "live");
  if (liveCandidates.length === 0) return null;

  const top = liveCandidates[0]!;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <Link2 size={14} className="text-primary/70 shrink-0" />
        <p className="text-sm text-foreground/85 truncate">
          Looks like your live product{" "}
          <strong className="font-semibold text-foreground/95">{top.title ?? top.productId}</strong>
          {top.brand && (
            <span className="text-muted-foreground/70"> ({top.brand})</span>
          )}
        </p>
        <span className="shrink-0 text-[10px] font-bold text-primary/60 tabular-nums">
          {Math.round(top.score * 100)}% match
        </span>
      </div>
      <button
        onClick={() => onLink(top.productId)}
        disabled={busy}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary/90 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
        Link <span className="text-primary/50 font-normal ml-0.5">[L]</span>
      </button>
    </div>
  );
}
