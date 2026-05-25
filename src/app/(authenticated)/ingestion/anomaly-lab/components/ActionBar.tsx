import { CheckCircle2, XCircle, SkipForward, Link2, Loader2 } from "lucide-react";

interface ActionBarProps {
  onApprove: () => void;
  onReject: () => void;
  onSkip: () => void;
  onLink: (() => void) | undefined;
  canApprove: boolean;
  busy: boolean;
}

function KeyHint({ letter }: { letter: string }) {
  return (
    <span className="inline-flex items-center justify-center size-4 rounded bg-white/[0.06] border border-border/[0.12] text-[9px] font-bold text-muted-foreground/60 font-mono ml-1">
      {letter}
    </span>
  );
}

export function ActionBar({ onApprove, onReject, onSkip, onLink, canApprove, busy }: ActionBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onApprove}
        disabled={!canApprove || busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 text-sm font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Approve <KeyHint letter="A" />
      </button>

      <button
        onClick={onReject}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400/80 text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-40"
      >
        <XCircle size={14} />
        Reject <KeyHint letter="R" />
      </button>

      {onLink && (
        <button
          onClick={onLink}
          disabled={busy}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary/80 text-sm font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40"
        >
          <Link2 size={14} />
          Link <KeyHint letter="L" />
        </button>
      )}

      <button
        onClick={onSkip}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.03] border border-border/[0.08] text-muted-foreground/60 text-sm font-semibold hover:bg-white/[0.06] transition-colors disabled:opacity-40"
      >
        <SkipForward size={14} />
        Skip <KeyHint letter="S" />
      </button>
    </div>
  );
}
