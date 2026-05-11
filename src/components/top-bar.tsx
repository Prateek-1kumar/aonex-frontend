"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Settings } from "lucide-react";

interface Tab {
  label: string;
  href: string;
}

interface TopBarProps {
  tabs?: Tab[];
  pendingCount?: number;
}

export default function TopBar({ tabs = [], pendingCount = 0 }: TopBarProps) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-border/[0.06] px-6"
      style={{
        height: "var(--topbar-height)",
        background: "hsl(var(--background) / 0.9)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Sub-tabs */}
      <nav className="flex items-center gap-1 h-full">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/ingestion" && pathname.startsWith(tab.href));
          const ingestionActive = tab.href === "/ingestion" && pathname === "/ingestion";
          const isActive = tab.href === "/ingestion" ? ingestionActive : active;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "relative flex items-center h-full px-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70",
              ].join(" ")}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary/100" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Global actions */}
      <div className="flex items-center gap-1">
        <button className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
          <Search size={15} />
        </button>

        <button className="relative flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
          <Bell size={15} />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 size-[6px] rounded-full bg-primary/100" />
          )}
        </button>

        <button className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
          <Settings size={15} />
        </button>

        <div className="ml-2 h-4 w-px bg-border/[0.1]" />

        <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
          Partner with{" "}
          <span className="text-primary/100">Aonami</span>
        </span>
      </div>
    </header>
  );
}
