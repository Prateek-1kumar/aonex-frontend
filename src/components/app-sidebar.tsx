"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge, Database, LayoutGrid, Sparkles, BarChart3,
  Zap, Terminal, Lock, Circle, LogOut, Loader2, ShieldCheck,
} from "lucide-react";
import { api, getLocalProfile, type SystemHealth, type UserProfile } from "@/lib/api";
import ThemeToggle from "@/components/theme-toggle";

const NAV = [
  { label: "Dashboard",      href: "/dashboard",      icon: Gauge },
  { label: "Ingestion",      href: "/ingestion",      icon: Database },
  { label: "Catalog",        href: "/catalog",        icon: LayoutGrid },
  { label: "Enrichment",     href: "/enrichment",     icon: Sparkles,   lockKey: "enrichment" },
  { label: "Quality",        href: "/enrichment/quality", icon: ShieldCheck },
  { label: "Analytics",      href: "/analytics",      icon: BarChart3,  lockKey: "analytics" },
  { label: "Optimisation",   href: "/optimisation",   icon: Zap,        lockKey: "optimisation" },
  { label: "Command Centre", href: "/command-centre", icon: Terminal,   lockKey: "command-centre" },
] as const;

type LockKey = "enrichment" | "analytics" | "optimisation" | "command-centre";
type NavItem = (typeof NAV)[number];

function getLockedSections(_hasConnections: boolean): Set<LockKey> {
  // Enrichment is a live feature now (the /enrichment workspace). The rest stay
  // locked until built.
  return new Set(["analytics", "optimisation", "command-centre"]);
}

function getLockKey(item: NavItem): LockKey | undefined {
  return "lockKey" in item ? (item.lockKey as LockKey) : undefined;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Partial<UserProfile>>(getLocalProfile());
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lockedSections, setLockedSections] = useState<Set<LockKey>>(
    new Set(["analytics", "optimisation", "command-centre"])
  );
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } finally {
      // Full navigation so all client state is dropped and middleware re-runs.
      window.location.href = "/login";
    }
  }

  useEffect(() => {
    // Real profile — works for both email login (Bearer) and Google OAuth (cookie).
    api.me()
      .then((p) => setProfile(p))
      .catch(() => {
        // Fall back to JWT decode if /me isn't reachable yet.
        setProfile(getLocalProfile());
      });

    api.listConnections()
      .then((conns) => setLockedSections(getLockedSections(conns.length > 0)))
      .catch(() => {});

    api.systemHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "nominal", loadPercent: 0 }));
  }, []);

  const statusColor = {
    nominal:  "text-success",
    degraded: "text-warning",
    offline:  "text-danger",
  }[health?.status ?? "nominal"];

  const isActive = (href: string) =>
    href === "/ingestion"
      ? pathname.startsWith("/ingestion")
      : pathname === href;

  const displayName = profile.displayName ?? "User";
  const role = profile.role ?? "Member";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-[var(--sidebar-width)] bg-background border-r border-border/[0.06]">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <span className="font-serif text-lg font-bold tracking-tight text-foreground">AONEX</span>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Global Control
        </p>
      </div>

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
                  ? "nav-active bg-primary/5 text-primary"
                  : locked
                    ? "pointer-events-none opacity-40"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
              ].join(" ")}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1 font-medium">{label}</span>
              {locked && <Lock size={11} className="shrink-0" />}
            </Link>
          );
        })}
      </nav>

      <div className="mx-6 h-px bg-border/[0.06]" />

      {/* Theme toggle — unified with the landing nav */}
      <div className="px-4 pt-3 pb-1">
        <ThemeToggle className="size-9 rounded-lg border border-border/[0.08] text-muted-foreground hover:text-foreground hover:bg-surface-hover" />
      </div>

      {/* User */}
      <div className="px-4 pt-2 pb-4 flex items-center gap-3">
        <div className="size-8 rounded-full flex items-center justify-center shrink-0 border border-border/[0.08] bg-primary/10">
          <span className="text-[11px] font-bold text-primary">
            {getInitials(displayName)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
            {role}
          </p>
        </div>
        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          title="Sign out"
          aria-label="Sign out"
          className="ml-auto size-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-40"
        >
          {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
        </button>
      </div>
    </aside>
  );
}
