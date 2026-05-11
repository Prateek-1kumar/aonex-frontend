import Link from "next/link";
import { Lock } from "lucide-react";

interface LockedSectionProps {
  title: string;
  subtitle: string;
  message: string;
}

export default function LockedSection({ title, subtitle, message }: LockedSectionProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Dimmed header */}
      <div className="mb-10 opacity-30">
        <h1 className="font-serif text-4xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {/* Lock card */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-xs">
          <div className="size-14 rounded-2xl bg-white/[0.04] border border-border/[0.08] flex items-center justify-center mb-5">
            <Lock size={22} className="text-muted-foreground/40" />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/50 mb-3">
            Locked
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>

          <Link
            href="/ingestion"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary/100 text-xs font-semibold uppercase tracking-widest hover:bg-primary/15 transition-colors"
          >
            Go to Ingestion Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}
