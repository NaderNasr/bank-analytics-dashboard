# Bank Analytics Dashboard

A retail banking analytics demo: transactions explorer, overview dashboard, live markets panel,
English and Arabic (RTL). Work in progress, built phase by phase. Architecture decisions are
recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Requirements

- Node.js 22+ (see `.nvmrc`)
- Postgres 16+ with `pg_trgm` (Neon, or a local install)

## Setup

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `AUTH_SECRET` (`npx auth secret`
   prints one) and `DEMO_USER_PASSWORD`.
2. `npm run db:migrate` creates the tables.
3. `npm run db:seed` loads the demo customer (about 12,000 transactions; replaces existing data).
4. `npm run dev`, open http://localhost:3000 and sign in with the demo account shown on the page.

## Scripts

| Command             | What it does                                                                  |
| ------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server on http://localhost:3000                                 |
| `npm run build`     | Production build                                                              |
| `npm run typecheck` | Generate route types, then `tsc --noEmit`                                     |
| `npm run lint`      | ESLint, zero warnings allowed                                                 |
| `npm run format`    | Format with Prettier (`format:check` to verify only)                          |
| `npm test`          | Unit and component tests (Vitest)                                             |
| `npm run test:e2e`  | End-to-end tests (Playwright; builds and starts app; needs a seeded database) |

## API

All endpoints return JSON and need a signed-in session (sign in through the browser first); without
one they return `401`. Money is in minor units (`amountMinor`; JOD has 3 decimals) and dates are
local days in Amman time.

| Endpoint                     | Purpose                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/accounts`          | Accounts with derived balance and available funds                              |
| `GET /api/transactions`      | Paginated, sortable, filterable list (see `src/lib/api/transactions-query.ts`) |
| `GET /api/transactions/{id}` | One transaction, with linked refunds or the other leg of a transfer            |
| `GET /api/summary`           | KPIs vs previous period, cash flow, categories, daily spending                 |

Example: `/api/transactions?from=2026-01-01&to=2026-03-31&category=dining,coffee&minAmount=5&q=talabat&sort=amount&order=desc`

The full README (demo link, screenshots, architecture) lands in the final phase.
