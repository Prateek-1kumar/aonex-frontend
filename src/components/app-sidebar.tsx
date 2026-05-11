"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge, Database, LayoutGrid, Sparkles, BarChart3,
  Zap, Terminal, Lock, Circle,
} from "lucide-react";
import { api, getLocalProfile, type SystemHealth } from "@/lib/api";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",       icon: Gauge },
  { label: "Ingestion",       href: "/ingestion",       icon: Database },
  { label: "Catalog",         href: "/catalog",         icon: LayoutGrid,  lockKey: "catalog" },
  { label: "Enrichment",      href: "/enrichment",      icon: Sparkles,    lockKey: "enrichment" },
  { label: "Analytics",       href: "/analytics",       icon: BarChart3,   lockKey: "analytics" },
  { label: "Optimisation",    href: "/optimisation",    icon: Zap,         lockKey: "optimisation" },
  { label: "Command Centre",  href: "/command-centre",  icon: Terminal,    lockKey: "command-centre" },
] as const;

type LockKey = "catalog" | "enrichment" | "analytics" | "optimisation" | "command-centre";

function getLockedSections(hasConnections: boolean): Set<LockKey> {
  if (!hasConnections) {
    return new Set(["catalog", "enrichment", "analytics", "optimisation", "command-centre"]);
  }
  return new Set(["enrichment", "analytics", "optimisation", "command-centre"]);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const profile = getLocalProfile();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lockedSections, setLockedSections] = useState<Set<LockKey>>(
    new Set(["catalog", "enrichment", "analytics", "optimisation", "command-centre"])
  );

  useEffect(() => {
    api.listConnections()
      .then((conns) => setLockedSections(getLockedSections(conns.length > 0)))
      .catch(() => {});

    api.systemHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "nominal", loadPercent: 0 }));
  }, []);

  const statusColor = {
    nominal:  "text-emerald-400",
    degraded: "text-amber-400",
    offline:  "text-red-400",
  }[health?.status ?? "nominal"];

  const isActive = (href: string) =>
    href === "/ingestion"
      ? pathname.startsWith("/ingestion")
      : pathname === href;

  const displayName = profile.displayName ?? "User";
  const role = profile.role ?? "Member";

  type NavItem = typeof NAV[number];
  function getLockKey(item: NavItem): LockKey | undefined {
    return "lockKey" in item ? (item.lockKey as LockKey) : undefined;
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/[0.06]"
      style={{ width: "var(--sidebar-width)", background: "hsl(var(--background))" }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <span className="font-serif text-lg font-bold tracking-tight text-foreground">
          AONEX
        </span>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Global Control
        </p>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-border/[0.06]" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV.map((item) => {
          const { label, href, icon: Icon } = item;
          const lockKey = getLockKey(item);
          const locked = lockKey ? lockedSections.has(lockKey) : false;
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className={[
                "relative flex items-center gap-3 rounded-lg px-3 h-10 text-sm transition-all duration-150",
                active
                  ? "nav-active text-primary/100 bg-primary/5"
                  : locked
                    ? "text-muted-foreground/40 pointer-events-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <Icon size={15} className="shrink-0" />
              <span className={`flex-1 font-medium ${active ? "text-[hsl(var(--primary))]" : ""}`}>
                {label}
              </span>
              {locked && <Lock size={11} className="shrink-0 opacity-40" />}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-6 h-px bg-border/[0.06]" />

      {/* System status */}
      <div className="px-6 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Circle size={7} className={`fill-current ${statusColor}`} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {health?.status === "degraded"
              ? "Degraded"
              : health?.status === "offline"
                ? "Offline"
                : "Optimal Performance"}
          </span>
        </div>

        {health && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span className="uppercase tracking-widest font-medium">System Load</span>
              <span className="font-mono">{health.loadPercent}%</span>
            </div>
            <div className="h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80 transition-all duration-700"
                style={{ width: `${health.loadPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-border/[0.06]" />

      {/* User */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border/[0.08]">
          <span className="text-[11px] font-bold text-primary/100">
            {getInitials(displayName)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
            {role}
          </p>
        </div>
      </div>
    </aside>
  );
}
