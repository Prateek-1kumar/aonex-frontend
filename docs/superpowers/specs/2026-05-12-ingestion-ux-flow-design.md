---
name: ingestion-ux-flow-design
description: Post-login tenant UI flow — sidebar shell, ingestion terminal, anomaly lab, dashboard, and locked section stubs. Aligned with Aonex HLD v2 ingestion architecture.
metadata:
  type: project
---

# Aonex — Post-Login Tenant UI Flow

## Overview

After login, authenticated tenants land on the **Ingestion Terminal**. A persistent sidebar provides top-level navigation across seven sections. A reusable top bar renders section-specific sub-tabs. Unbuilt sections are visible in the sidebar but locked until prerequisite data exists.

---

## 1. Global Shell Architecture

### Layout

```
┌────────────────────────────────────────────────────────┐
│ SIDEBAR (256px, fixed left)  │  TOP BAR (sticky, h-16) │
│                              ├─────────────────────────┤
│                              │  CONTENT AREA           │
│                              │  (scrollable, padded)   │
└──────────────────────────────┴─────────────────────────┘
```

### Colour & Theme

- Background: `#000000`
- Primary accent: `#1AC1CE` (cyan)
- Muted text: `#a1a1aa`
- Border: `rgba(26, 193, 206, 0.2)`
- Cards: glassmorphism — `rgba(26, 193, 206, 0.05)` bg + `backdrop-blur-sm`
- Typography: Playfair Display (headings, serif) + Poppins (UI labels, sans)
- Border radius: `rounded-2xl` on cards, `rounded-full` on badges
- No border radius on sidebar or top bar (sharp edges)

The current warm cream / terracotta theme in `globals.css` is replaced by this palette.

---

## 2. Sidebar

### Structure

```
┌──────────────────────────┐
│  AONEX  (logo)           │
│  GLOBAL CONTROL          │  ← 10px uppercase, muted
├──────────────────────────┤
│  ○  Dashboard            │
│  ▣  Ingestion            │  ← active: 2px cyan left bar + text-primary
│  ⊞  Catalog        🔒   │  ← locked: label at 50% opacity, lock icon right
│  ✦  Enrichment     🔒   │
│  ↑  Analytics      🔒   │
│  ⚡ Optimisation   🔒   │
│  ⬛ Command Centre  🔒   │
├──────────────────────────┤
│  ● OPTIMAL PERFORMANCE   │  ← real system health endpoint
│  SYSTEM LOAD      [n]%   │  ← real metric, not hardcoded
├──────────────────────────┤
│  [XX] {User Name}        │  ← from JWT session
│       {ROLE UPPERCASE}   │  ← from auth response
└──────────────────────────┘
```

### Active State

- Text: `text-primary` (`#1AC1CE`)
- Left indicator: `2px` wide `h-1/2` vertical bar anchored at `top-1/4` via `before:` pseudo-element

### Locked State

- Nav item text and icon: 50% opacity
- Lock icon (`🔒`) rendered right-aligned in the nav item row
- Hover has no highlight effect on locked items
- Clicking a locked item routes to the section's lock screen (does not block navigation)

### Sidebar Footer (dynamic, no hardcoded values)

- **User card**: `displayName`, `role` from JWT/session payload; avatar renders initials in a `size-9` circle with `bg-primary/10 text-primary` fallback
- **System load**: fetched from `/api/system/health` on sidebar mount; renders skeleton until resolved
- **Status pill**: `nominal` → green dot + "OPTIMAL PERFORMANCE"; `degraded` → amber; `offline` → red

---

## 3. Top Bar (Reusable Component)

### Props

```typescript
interface TopBarProps {
  tabs?: { label: string; href: string }[];
}
```

### Layout

```
[ TERMINAL ]  [ ANOMALY LAB ]          PARTNER WITH AONAMI  🔍 🔔 ◑ ⚙ [DP]
     ▔▔▔▔▔▔▔  (active underline)
```

- Sub-tabs: left-aligned, `text-[10px] font-bold uppercase tracking-[0.2em]`
- Active tab: `text-primary` + `h-[2px] w-full bg-primary` bottom underline
- Inactive tab: `text-muted-foreground`, hover → `text-foreground`
- Right side (always rendered, never changes): search icon, notification bell (badge with Anomaly Lab pending count), theme toggle, settings icon, user avatar
- `tabs` prop is optional — Dashboard renders the top bar with no sub-tabs (clean header only)

### Sub-Tab Map

| Sidebar Section   | Top Bar Tabs                  |
|-------------------|-------------------------------|
| Dashboard         | *(none)*                      |
| Ingestion         | `TERMINAL` · `ANOMALY LAB`    |
| Catalog           | `PRODUCTS` · `PROJECTIONS`    |
| Enrichment        | `ENRICHMENT` · `MAPPINGS`     |
| Analytics         | `OVERVIEW` · `CHANNELS`       |
| Optimisation      | `OPPORTUNITIES`               |
| Command Centre    | `LOGS` · `SYNC STATUS`        |

---

## 4. Post-Login Routing

- **First login** (no ingestion sources configured): redirect to `/ingestion` (Terminal tab)
- **Returning user**: land on `/dashboard`
- **Auth middleware** already handles unauthenticated redirects to `/login`; add a post-auth redirect check using `GET /api/connections` — if the response returns an empty array, treat as first-time user and redirect to `/ingestion`

---

## 5. Ingestion Terminal (`/ingestion` → TERMINAL tab)

### Page Header

```
Ingestion Terminal              ← Playfair Display, large
DATA ORCHESTRATION & NEURAL MAPPING  ← 10px uppercase, muted
```

### Content Grid (two columns: ~65% / 35%)

**Left — Ingest Manifest (CSV / PDF drop zone)**

- Large card with dashed cyan border (`border-dashed border-primary/40`)
- Upload icon centred, `size-16`, `text-primary/60`
- Label: "Ingest Manifest"
- Subtitle: "Drag & drop CSV or PDF to begin neural orchestration"
- Secondary CTA: "Browse files" link below
- Accepts: `.csv`, `.pdf`
- On drop/select: shows inline progress bar, then routes to `ANOMALY LAB` tab if any items need review, or shows success toast if all auto-approved

**Right — Two stacked cards**

*Card 1 — External Link*
- Header: `↗ EXTERNAL LINK`
- Input: `https://supplier.com/catalog` placeholder
- `+` submit button inline with input (cyan)
- Subtitle: "Paste a marketplace listing URL to extract one product"
- On submit: same routing logic as CSV (Anomaly Lab or success toast)

*Card 2 — Quick Orchestration (Connectors)*
- Header: `+ QUICK ORCHESTRATION`
- Label: "Connect Marketplace"
- Grid of marketplace tiles: Shopify, Amazon, eBay, Walmart, Etsy
- Phase 1 live (Shopify): clickable, triggers Nango connect flow
- Phase 3 (Amazon, eBay, Walmart, Etsy): tile visible with `SOON` badge overlay, non-interactive

### Active Sources Strip

Appears below the grid after any successful ingestion:
- One row per connected source (marketplace name, lane type, last sync time, status badge)
- "Sync now" action per source

---

## 6. Anomaly Lab (`/ingestion` → ANOMALY LAB tab)

### Page Header

```
Anomaly Lab                     ← Playfair Display, large
HUMAN VERIFICATION QUEUE        ← 10px uppercase, muted
[ 12 pending ]  [ 3 high severity ]  ← live count badges (cyan / red)
```

### Filter Bar

```
ALL · LOW_CONFIDENCE · MISSING_ATTRIBUTE · DUPLICATE · CATEGORY_AMBIGUOUS · CHANNEL_ERROR
```

Pill-style filters; active pill: `bg-primary/10 text-primary border-primary/30`

### Split Layout (40% task list / 60% review panel)

**Task List (left)**

Each task card shows:
- Severity dot: `●` red (high), `◑` amber (medium), `○` muted (low)
- Task type label
- SKU identifier
- Relative timestamp
- Active card: `border-primary/40` highlight

**Review Panel (right)**

Sections:
1. **Source Evidence** — field name, raw value, extraction source (e.g., "row 42, CSV upload")
2. **Mapping Candidates** — top 3 candidates with confidence scores as a ranked list
3. **Actions row**:
   - `[Approve as-is]` — primary cyan button
   - `[Edit + Approve]` — makes panel fields inline-editable, no modal
   - `[Reject]`
   - `[Merge with existing]`
   - `[Escalate]`

**Post-action behaviour:**
- Task fades out of list, next task auto-loads into review panel
- Bell badge count decrements

**Empty state:**
- Centred card: "All clear. No items need review." + cyan checkmark icon

---

## 7. Dashboard (`/dashboard`)

### Page Header

```
Command Dashboard               ← Playfair Display, large
EXECUTIVE PULSE                 ← 10px uppercase, muted
                    [Re-sync]  [Export Brief]  ← top-right actions
```

### KPI Strip (6 cards, staggered 60ms fade-in)

| Card | Metric |
|------|--------|
| SKUS INGESTED | Total source artifacts processed |
| AUTO APPROVED | % of ingestion auto-approved |
| IN REVIEW | Current Anomaly Lab queue depth |
| REJECTED | Items rejected by policy engine |
| CHANNELS ACTIVE | Connected / total possible |
| SYNC HEALTH | % of sync attempts succeeded |

### Main Grid (2 columns)

- Ingestion Throughput — line chart (SKUs/day)
- Review Queue Trend — bar chart (by anomaly type)
- Channel Sync Status — per-marketplace table (name, last sync, status)
- Top Anomaly Types — ranked list

### Empty State (no ingestion data yet)

- KPI cards render with `—` values and shimmer border (no skeleton)
- Charts replaced by a single centred card: "Your dashboard activates after first ingestion." + cyan CTA → `/ingestion`
- No placeholder or fake chart data

---

## 8. Locked Section Stubs

All unbuilt sections (Catalog, Enrichment, Analytics, Optimisation, Command Centre) follow the same pattern:

```
PAGE HEADER (40% opacity)
  "{Section Name}"
  {SECTION SUBTITLE}

CONTENT AREA (centred)
┌─────────────────────────────────────┐
│   🔒  (lock icon, text-primary)    │
│   LOCKED  (10px uppercase, cyan)   │
│                                     │
│   {Section-specific message}        │
│                                     │
│   [  Go to Ingestion Terminal  ]   │
└─────────────────────────────────────┘
```

### Lock Conditions

| Section         | Unlocks when                              |
|-----------------|-------------------------------------------|
| Catalog         | ≥1 auto-approved product exists           |
| Enrichment      | Catalog has ≥1 approved product           |
| Analytics       | First channel sync attempt completes      |
| Optimisation    | Analytics has ≥7 days of data             |
| Command Centre  | First sync attempt recorded               |

### Section-Specific Messages

| Section | Subtitle | Lock Message |
|---|---|---|
| Catalog | PRODUCT INTELLIGENCE | Populates after first ingestion is approved |
| Enrichment | ATTRIBUTE ENHANCEMENT | Activates after Catalog has approved products |
| Analytics | PERFORMANCE METRICS | Available once channel sync is active |
| Optimisation | OPPORTUNITY ENGINE | Requires Analytics baseline of 7+ days |
| Command Centre | OPERATIONS HUB | Available after first sync attempt is recorded |

---

## 9. Route Map

| Route | Component | Auth | Notes |
|---|---|---|---|
| `/` | Landing page | No | Unchanged |
| `/login` | Login form | No | Unchanged |
| `/signup` | Signup form | No | Unchanged |
| `/signup/workspace` | Workspace setup | No | Unchanged |
| `/dashboard` | Dashboard | Yes | Default for returning users |
| `/ingestion` | Ingestion Terminal | Yes | Default for first-time users |
| `/ingestion/anomaly-lab` | Anomaly Lab | Yes | Sub-route rendered inside Ingestion layout |
| `/catalog` | Catalog stub → Products | Yes | Locked until condition met |
| `/enrichment` | Enrichment stub | Yes | Locked until condition met |
| `/analytics` | Analytics stub | Yes | Locked until condition met |
| `/optimisation` | Optimisation stub | Yes | Locked until condition met |
| `/command-centre` | Command Centre stub | Yes | Locked until condition met |

---

## 10. Components to Build

| Component | Location | Purpose |
|---|---|---|
| `AppSidebar` | `src/components/app-sidebar.tsx` | Fixed nav shell, dynamic footer |
| `TopBar` | `src/components/top-bar.tsx` | Reusable sub-tab bar + global actions |
| `IngestionTerminal` | `src/features/ingestion/terminal.tsx` | Three-method ingestion layout |
| `AnomalyLab` | `src/features/ingestion/anomaly-lab.tsx` | Task list + review panel |
| `Dashboard` | `src/features/dashboard/dashboard.tsx` | KPI strip + charts |
| `LockedSection` | `src/components/locked-section.tsx` | Reusable lock screen stub |
| `ActiveSourcesStrip` | `src/features/ingestion/active-sources.tsx` | Post-ingestion source list |

The existing `/connections` page and its logic migrates into `IngestionTerminal` (Quick Orchestration card). The `/connections` route is retired.
