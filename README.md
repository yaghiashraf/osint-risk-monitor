# WheelDesk

An operations desk for the **wheel strategy** (cash-secured puts → assignment → covered calls). Not a screener — a tool that manages the full position lifecycle, with a differentiator nobody else ships: the **Assignment Repair Engine** for what happens *after* you get assigned.

Three screens:

1. **CSP Scanner** (`/scanner`) — find cash-secured put entries under the "House Rules" preset (30–45 DTE, VIX-adjusted delta band, quality + earnings filters, min 3% ROC, liquidity floors).
2. **Position Desk** (`/desk`) — track open CSPs (**Good Bank**) and assigned lots + covered calls (**Bad Bank**), with the **Trap System** (close at 50% of max profit) and earnings/delta/expiry alerts.
3. **Repair Engine** (`/repair/[lot]`) — the Adjusted-Basis Ladder, a **Desk Pick**, and a shareable repair chart that works your cost basis down without capping recovery.

## Runs with zero keys

The app is fully usable **without any API keys**: positions persist in `localStorage`, and option chains come from a deterministic **mock market-data provider** (clearly labelled "Demo data"). Add keys to switch to live (delayed) data, real auth, persistence, and billing.

## Stack

Next.js 16 (App Router, TS) · Tailwind v4 (dark only) · Recharts · Clerk (auth) · Supabase (Postgres + RLS) · Stripe (billing) · Tradier sandbox (options data, swappable via `MarketDataProvider`) · FMP (fundamentals).

## Local setup (under 10 steps)

1. `npm install`
2. `cp .env.example .env` (leave everything blank to run in demo mode)
3. `npm run dev` → open http://localhost:3000
4. Click **Load demo positions** on the Desk — you'll see a **Trap** alert and a full **Repair** plan immediately.

To enable the full stack:

5. **Supabase**: create a project, run `supabase/schema.sql` in the SQL editor, and set `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Seed the universe: `npm run seed:quality`.
6. **Clerk**: create an app (email + Google), set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`. Routes `/desk`, `/scanner`, `/repair/*`, `/settings` become protected.
7. **Tradier**: get a free sandbox key at developer.tradier.com, set `TRADIER_API_KEY` (base URL defaults to the sandbox). Scanner/desk/repair switch to delayed real chains.
8. **Stripe**: create one Pro product with monthly ($39) + annual ($349) prices; set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, and `STRIPE_WEBHOOK_SECRET`. Point a webhook at `/api/stripe/webhook`.
9. **FMP** (optional): set `FMP_API_KEY` to refresh `quality_list` fundamentals via the weekly cron.

## Crons (Vercel)

`vercel.json` schedules two jobs:

- `/api/cron/alerts` — daily (10:00 ET) re-evaluation of Trap/earnings/delta/expiry alerts.
- `/api/cron/quality` — weekly `quality_list` fundamentals refresh.

Protect them by setting `CRON_SECRET` (routes then require `Authorization: Bearer <secret>`).

## Architecture notes

- **Domain math is pure** (`lib/domain/`): ROC/annualized, adjusted-basis ladder, repair ETA, Trap evaluation, scanner House Rules, alert evaluation, and plan gating — all framework-free and reused by both the client screens and the server cron.
- **Market data is swappable** (`lib/marketdata/`): a `MarketDataProvider` interface with a Tradier sandbox implementation, a mock implementation, and a 15-minute cache. Drop in Polygon/Tradier-prod later without touching the screens.
- **Gating is centralized** (`lib/domain/gating.ts`): `canTrackMorePositions` / `scannerRowLimit`. Free = 3 positions, 10 scanner rows.
- **Adjusted basis**: assignment stores the raw basis as the strike; the CSP premium is carried as a "premium collected on the lot" so `adjusted = raw − premiums/shares` never double-counts.

## Explicitly not in v1

No broker execution (tracking only), no mobile app, no backtesting, no light mode, no email notifications, no custom watchlist on free tier, no AI features. The math is the product.
