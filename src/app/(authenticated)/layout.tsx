"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import TopBar from "@/components/top-bar";

const TABS: Record<string, { label: string; href: string }[]> = {
  "/ingestion": [
    { label: "Terminal",    href: "/ingestion" },
    { label: "Anomaly Lab", href: "/ingestion/anomaly-lab" },
  ],
  "/ingestion/anomaly-lab": [
    { label: "Terminal",    href: "/ingestion" },
    { label: "Anomaly Lab", href: "/ingestion/anomaly-lab" },
  ],
  "/catalog": [
    { label: "Products",    href: "/catalog" },
    { label: "Projections", href: "/catalog/projections" },
  ],
  "/enrichment": [
    { label: "Drafting Room", href: "/enrichment" },
    { label: "Review Commit", href: "/enrichment/review-commit" },
    { label: "History",       href: "/enrichment/history" },
  ],
  "/enrichment/review-commit": [
    { label: "Drafting Room", href: "/enrichment" },
    { label: "Review Commit", href: "/enrichment/review-commit" },
    { label: "History",       href: "/enrichment/history" },
  ],
  "/enrichment/history": [
    { label: "Drafting Room", href: "/enrichment" },
    { label: "Review Commit", href: "/enrichment/review-commit" },
    { label: "History",       href: "/enrichment/history" },
  ],
  "/analytics": [
    { label: "Overview",  href: "/analytics" },
    { label: "Channels",  href: "/analytics/channels" },
  ],
  "/optimisation": [
    { label: "Opportunities", href: "/optimisation" },
  ],
  "/command-centre": [
    { label: "Logs",        href: "/command-centre" },
    { label: "Sync Status", href: "/command-centre/sync-status" },
  ],
};

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = TABS[pathname] ?? [];

  return (
    // Sidebar is position:fixed (out of flow); the content column only needs the
    // left margin to clear it. Using flex-1 here would grow the column to the full
    // viewport width AND then get pushed right by the margin, overflowing by the
    // sidebar width — so it's a plain block whose auto width fills 100vw − sidebar.
    <div className="min-h-screen bg-background">
      <AppSidebar />
      {/* h-screen + min-h-0 makes <main> the internal scroll container (its
          overflow-auto/scrollbar-thin already intend this). Without a fixed
          height the column grows and the WINDOW scrolls instead, which silently
          breaks every position:sticky inside main (e.g. the catalog rail). */}
      <div className="flex h-screen flex-col ml-[var(--sidebar-width)]">
        <TopBar tabs={tabs} />
        <main className="flex-1 min-h-0 overflow-auto scrollbar-thin p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
