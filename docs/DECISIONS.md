# Decisions

A running log of architecture decisions. Each entry records the context, the choice, and what
was traded away, so "why did you choose X?" has a written answer.

---

## 001 — Project scaffold and folder structure

**Date:** 2026-11-06 · **Phase:** 0

### Context

A one-week portfolio build of a retail banking analytics dashboard: Next.js App Router, a Postgres
data layer, auth, i18n with RTL, charts, a large virtualised table and a real-time panel. The
structure has to stay navigable as those land phase by phase, and it should make the
server/client boundary obvious.

### Decision

Next.js 16 (App Router, `src/` directory, `@/*` alias), TypeScript in strict mode plus
`noUncheckedIndexedAccess`, Tailwind CSS v4, ESLint (Next core-web-vitals + TypeScript rules) with
Prettier owning formatting, Vitest + React Testing Library for unit and component tests, and
Playwright for end-to-end tests.

Target folder tree (folders are created when the phase that needs them starts, not up front):

```text
.
├── .github/workflows/ci.yml     # typecheck, lint, format check, unit tests
├── docs/DECISIONS.md            # this file
├── e2e/                         # Playwright specs
├── messages/                    # next-intl message files: en.json, ar.json      (Phase 3)
├── public/
└── src/
    ├── app/                     # routing only: layouts, pages, route handlers
    │   ├── (auth)/sign-in/                                                       (Phase 2)
    │   ├── (dashboard)/         # overview, transactions, markets                (Phase 3+)
    │   └── api/                 # transactions, summary, accounts                (Phase 1)
    ├── components/
    │   ├── ui/                  # design-system primitives (button, drawer, …)
    │   └── layout/              # app shell: sidebar, top bar                     (Phase 3)
    ├── features/                # one folder per feature: components, hooks, queries
    │   ├── overview/                                                              (Phase 4)
    │   ├── transactions/                                                          (Phase 5)
    │   └── markets/                                                               (Phase 6)
    ├── server/                  # server-only code: db client, schema, query builders, auth
    │   └── db/                  # Drizzle schema, seed                            (Phase 1)
    ├── lib/                     # framework-agnostic helpers safe on both sides (env, format, money)
    ├── i18n/                    # next-intl config and request helpers           (Phase 3)
    ├── styles/tokens.css        # design tokens, light and dark                  (Phase 3)
    └── test/setup.ts            # Vitest setup (jest-dom matchers, cleanup)
```

Rules that go with it:

- `app/` holds routing only. Pages are thin and compose from `features/`.
- `server/` is never imported by client components; files there import `server-only` so a wrong
  import fails the build rather than leaking a DB client into the bundle.
- Unit and component tests sit next to the code as `*.test.ts(x)`; end-to-end specs live in `e2e/`.

### Alternatives considered

- **Layer-first (`components/`, `hooks/`, `services/` at the top).** Familiar, but a feature's
  code ends up spread over five folders. Feature folders keep a change to "transactions" in one
  place.
- **Colocating everything under `app/` with private `_folders`.** Works for small apps, but it ties
  feature code to URL structure and makes it awkward to reuse a widget on two routes.
- **Jest instead of Vitest.** Vitest shares Vite's transform pipeline, needs less config for
  TS/ESM, and is faster in watch mode.

### Consequences

- CI runs typecheck, lint, format check and unit tests on every push and PR. Playwright runs
  locally (`npm run test:e2e`) for now; it moves into CI once auth and a seeded database exist.
- `@playwright/test` is pinned to an exact version so it always matches the installed browsers.
- `npm run typecheck` runs `next typegen` first, so typed routes (`LayoutProps`, `PageProps`) are
  available without a full build.

---

## 002 — Data model: minor units, derived balances, language-neutral categories

**Date:** 2026-11-06 · **Phase:** 1

### Decision

- Drizzle ORM on Neon Postgres (`drizzle-orm/neon-http`). Schema in `src/server/db/schema.ts`,
  SQL migrations generated into `drizzle/`.
- Money is stored as positive integer minor units (`bigint`, read as JS `number`) plus an explicit
  `direction` (debit/credit) and an ISO 4217 `currency`. No floats, no signed amounts.
- Account balances are derived (opening balance + posted transactions), never stored.
- Categories store only a `slug`; English and Arabic labels live in the i18n message files.
- Transfers between own accounts share a `transfer_group_id`; reversals point at the original via
  `reversal_of_id`.
- `pg_trgm` GIN index on `description` for substring search; btree indexes match the explorer's
  sort and filter paths.
- Env vars are validated with zod (`src/lib/env.ts`); the DB client imports `server-only`.

### Alternatives considered

- **`numeric` / decimal amounts.** Exact, but drivers return strings and every consumer has to
  parse them. Integers are exact and cheap to aggregate; values stay below 2^53.
- **Stored running balance.** Faster reads, but it can drift from the ledger and complicates the
  seed. At ~12k rows the aggregate is cheap.
- **Full-text search (`tsvector`).** Better for words in long text; trigram suits short merchant-style
  descriptions and partial matches like "carr" → "Carrefour".
