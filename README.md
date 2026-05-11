# aonex-frontend

Next.js 15 (App Router) merchant dashboard for Aonex. Deployed to
Vercel. The backend lives in a separate repo at `~/aonex-backend`.

## Running locally

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend (default: http://localhost:8787)
# Set NEXT_PUBLIC_NANGO_PUBLIC_KEY from your Nango dashboard

bun install      # or npm/pnpm/yarn
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 pages

- `/` — landing
- `/login` — JWT login → stores token in localStorage
- `/connections` — list + create marketplace connections (Shopify
  active, others gated by HLD phase)

## Calling the backend

`src/lib/api.ts` is the only file allowed to call the backend.
Components import functions from there; they never `fetch()` directly.
This keeps the API surface auditable and makes auth handling
swappable (move JWT to httpOnly cookies later by editing this one
file).

## Why a separate repo

The HLD does not mandate a monorepo for backend + frontend. Splitting
keeps frontend deploys (Vercel) decoupled from backend deploys (EC2),
and stops frontend devs from accidentally importing backend modules.

The cost: shared types live in two places. Phase 1 keeps the API
contract tiny and hand-typed in `src/lib/api.ts`. If it grows, we
publish `@aonex/types` (or just the API subset) to a private registry
or copy it via a one-line cron.
# aonex-frontend
