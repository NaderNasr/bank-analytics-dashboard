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

- Drizzle ORM on Postgres (Neon in production; driver choice in 003). Schema in
  `src/server/db/schema.ts`, SQL migrations generated into `drizzle/`.
- Money is stored as positive integer minor units (`bigint`, read as JS `number`) plus an explicit
  `direction` (debit/credit) and an ISO 4217 `currency`. No floats, no signed amounts. The demo
  uses JOD, which has **three** decimals (1 JOD = 1000 fils), so the number of decimals always
  comes from the currency (`src/lib/money.ts`), never a hard-coded `/ 100`.
- Account balances are derived (opening balance + posted transactions), never stored.
- Categories store only a `slug`; English and Arabic labels live in the i18n message files.
- Transfers between own accounts share a `transfer_group_id`; merchant refunds are separate posted
  credits that point at the purchase via `refund_of_id`.
- Status semantics: `posted` counts towards the balance; `pending` (authorised, not settled),
  `failed` (declined) and `reversed` (settled then cancelled by the bank) do not.
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

---

## 003 — node-postgres driver and a simulated, deterministic seed

**Date:** 2026-11-06 · **Phase:** 1

### Context

The seed must produce the same ~12,000 transactions every time, look like a real person's
account, and run against both Neon and a local Postgres (for development and CI without a cloud
database).

### Decision

- **Driver:** `drizzle-orm/node-postgres` with a `pg` pool, created by `createDb()` in
  `src/server/db/client.ts`. It works with Neon's pooled connection string and with plain Postgres,
  and supports real transactions, which the seed uses.
- **Generator is pure** (`src/server/db/seed/generate.ts`): a seeded faker instance, a fixed end
  date (`2026-11-01`) and no clock or I/O. The writer (`run.ts`) truncates and inserts in one
  transaction, in batches of 1,000 rows.
- **Day-by-day simulation in Amman time (UTC+3)** with running balances, so patterns emerge
  rather than being sprinkled on:
  - salary on the 25th (moved to Thursday if it falls on the Friday/Saturday weekend), with a
    raise after 12 months;
  - rent standing order on the 1st, direct debits for telecom, utilities (seasonal peaks) and the
    gym, card subscriptions on fixed days;
  - everyday purchases drawn from a weighted merchant list, with more of them and pricier ones at
    the weekend;
  - card statement paid in full on the 5th; a fixed saving plus a sweep of surplus on the 26th;
    savings top up the current account when it runs low;
  - card purchases decline when they would exceed the credit limit, debit purchases on
    insufficient funds, plus a small random decline rate; rare bank reversals; occasional full or
    partial refunds; foreign-transaction fees; pending status for the last two days.
- Unit tests assert the invariants (determinism, volume, monthly cycles, weekend uplift, status
  mix, refund and transfer links, never overdrawn).

### Alternatives considered

- **`@neondatabase/serverless` (HTTP driver).** Lowest latency on serverless, but it only talks
  to Neon and the HTTP mode has no interactive transactions. Can be swapped in later behind
  `createDb()` if cold-start latency matters.
- **Independent random rows per pattern.** Simpler, but balances go negative and the cash-flow
  chart tells no story. Simulation costs ~100 ms.
- **Seed relative to "today".** Always-fresh dates, but no longer deterministic; the end date can
  be moved with `npm run db:seed -- --end YYYY-MM-DD` instead.

---

## 004 — REST API: shared zod contract, pure SQL builders, offset pagination

**Date:** 2026-11-06 · **Phase:** 1

### Decision

- **Endpoints:** `GET /api/transactions`, `GET /api/transactions/[id]`, `GET /api/summary`,
  `GET /api/accounts`. JSON only, `Cache-Control: private, no-store`, errors as
  `{ error: { code, message, issues? } }` with 400/401/404/500.
- **One contract for server and client.** Query schemas (zod) and response types live in
  `src/lib/api/` and are safe to import in the browser, so the explorer (Phase 5) builds URLs
  against the same rules the server enforces. Multi-value filters accept `?x=a&x=b` and `?x=a,b`.
  Amount filters are given in JOD and converted to fils on parse.
- **Pure SQL builders** (`src/server/queries/transactions-sql.ts`) turn validated params into
  Drizzle `WHERE`/`ORDER BY` fragments. Tests render them with `PgDialect` and assert the SQL and
  bind parameters, with no database needed in CI.
- **Search** is `ILIKE` over description, merchant name and reference, with `%`/`_` escaped and
  the value always bound as a parameter. The trigram index serves it as data grows.
- **Offset pagination** (`page`, `pageSize` ≤ 200) with a total count, ordered by the sort column,
  then `occurred_at`, then `id`, so pages never overlap when values tie.
- **Dates** in the API are local days (`YYYY-MM-DD`, Amman time, inclusive) converted to a
  half-open UTC range on the server.
- **Summary semantics:** income excludes refunds and transfers; spending is expense debits minus
  refunds; only `posted` rows count. The default range is the 12 calendar months ending on the
  user's **latest transaction**, not the server clock, so a seeded demo never shows empty months.
  KPIs come with the previous period of equal length for deltas.
- **Lazy env and DB client** (`getServerEnv()`, `getDb()`): `next build` imports every route to
  collect config, so validating at import time made builds require a database.
- The user came from a fixed demo lookup in Phase 1; Phase 2 replaced it with the session
  (see 005) without touching the routes.

### Alternatives considered

- **Keyset (cursor) pagination.** Faster for deep pages and immune to inserts shifting rows, but
  it cannot jump to an arbitrary page and makes "row N of 11,850" for a virtualised table awkward.
  At this size offset scans are a few milliseconds; revisit beyond ~1M rows.
- **Server Actions or tRPC instead of REST.** Less boilerplate inside Next, but the brief asks for
  REST, and plain HTTP endpoints are easy to demo with curl and to cache later.

## 005 — Authentication: Auth.js credentials, JWT sessions, two layers of checks

**Date:** 2026-11-06 · **Phase:** 2

### Context

The brief asks for a credentials sign-in with a single demo user whose credentials come from env
and are shown on the sign-in page, with the dashboard and API protected.

### Decision

- **Auth.js v5 (`next-auth@5` beta) with one Credentials provider** (`src/server/auth/`). The
  config is built lazily, like the env and DB client, so `next build` needs no secrets.
- **Stateless JWT sessions** in Auth.js's encrypted, HttpOnly, SameSite=Lax cookie, 8-hour
  lifetime. There is one demo user and no revocation requirement, so a session table would add a
  query to every request for nothing.
- **Credentials:** `DEMO_USER_EMAIL` (defaults to `demo@bank-analytics.dev`) and
  `DEMO_USER_PASSWORD` in env, validated with zod alongside `AUTH_SECRET` (`parseAuthEnv`, kept
  separate from the database env so the seed and migrations don't need auth secrets). The seed
  reads the same email. The check hashes both sides and uses `timingSafeEqual`, and always
  compares email and password so timing does not reveal which was wrong. After a match the user
  is looked up in the database; a missing row gets its own error telling you to run the seed.
- **Two layers of protection.** `src/proxy.ts` (Next 16's renamed middleware) redirects anonymous
  page requests to `/sign-in?callbackUrl=…` and answers anonymous `/api/*` calls with a JSON 401.
  Route handlers then check the session again in `withUser`, and pages check it in the component
  that reads it, as the Next docs recommend, so a matcher change can never expose data.
- **Open-redirect guard.** `safeCallbackUrl` only accepts same-origin absolute paths (rejecting
  `//host`, `/\host`, schemes and control characters) and is used by both the proxy and the
  sign-in action.
- **Sign-in is a Server Action** with `useActionState`: zod validation with per-field messages
  linked via `aria-describedby`, distinct messages for wrong credentials, a missing seed and
  server errors, and the email kept after a failed attempt. It works without JavaScript.
- **Cache Components:** the session and the sign-in query are read inside `<Suspense>`, so both
  pages keep a prerendered static shell.

### Alternatives considered

- **iron-session or a hand-rolled cookie.** Smaller, and what the Next docs use for examples, but
  the brief names Auth.js, and it leaves room for adding an OAuth provider later.
- **Database sessions.** Instant revocation, at the cost of a lookup per request. Not needed for a
  single public demo account.
- **Rate limiting sign-in.** The demo password is public, so throttling protects nothing here. A
  real deployment would add it (for example Upstash Ratelimit on the action).

## 006 — Neon wiring: pooled URL for the app, direct URL for migrations

**Date:** 2026-11-07 · **Phase:** 2

### Context

The app is linked to a Neon project with `neon init` (`neon.ts` declares the services; Postgres
only). `neon env pull` / `neon deploy` write `DATABASE_URL` (pooled, through PgBouncer in
transaction mode) and `DATABASE_URL_UNPOOLED` (direct) into `.env.local`. Hosting is Vercel.

### Decision

- **Keep node-postgres (`pg`) with Drizzle.** Neon's guidance for Vercel is `pg` on Fluid compute
  with `attachDatabasePool` from `@vercel/functions`, which keeps a suspended instance alive until
  idle connections close. `getDb()` calls it; it is a no-op off Vercel. The serverless HTTP driver
  is for edge runtimes, and nothing here runs on the edge (the proxy runs on Node in Next 16).
- **The app uses the pooled `DATABASE_URL`.** Bursty serverless concurrency is what PgBouncer is
  for, and the app's queries are single statements or short transactions.
- **Migrations and the seed use `DATABASE_URL_UNPOOLED` when set** (`migrationDatabaseUrl`),
  falling back to `DATABASE_URL` for a local Postgres. DDL and a long seeding transaction should
  not depend on transaction-mode pooling.
- `sslmode=verify-full` in connection strings, which is what `sslmode=require` means in `pg` today
  and silences its deprecation warning.

## 007 — Design tokens, app shell, English and Arabic

**Date:** 2026-11-07 · **Phase:** 3

### Context

The brief asks for a fintech look that signals loyalty and security, the Onest typeface, an app
shell, English and Arabic with full right-to-left support, and logical CSS properties only. The
visual direction was generated with the UI UX Pro Max skill and approved from a preview.

### Decision

- **Palette ("Banking / Traditional Finance").** Navy for security and trust (navigation rail,
  primary actions), gold for loyalty and reward, used only as an accent: the active nav marker,
  the membership badge and short dividers. The skill's first suggestion for "fintech" was gold
  with purple on dark glass, aimed at crypto; it contradicted the brief and the skill's own
  "avoid AI purple" rule, so the Financial Dashboard style (data-dense, minimal) was used instead.
- **Accessibility as a token property.** Every text/background pair is at least 4.5:1 in both
  themes, and form-control borders and focus rings are at least 3:1. Decorative dividers
  (`--border`) are separate from control borders (`--border-strong`) so a subtle divider never
  weakens a form field.
- **Tokens in one file** (`src/styles/tokens.css`), mapped to Tailwind names in `globals.css`
  (`bg-surface`, `text-fg-muted`, `bg-gold-accent`…). Components never contain hex values.
- **Theme:** light by default, dark from `prefers-color-scheme`, overridable with a toggle
  (System → Light → Dark) stored in `localStorage` and applied by a tiny inline script before
  first paint, so there is no flash and no cookie read that would make pages dynamic.
- **Fonts:** Onest (Latin) and Noto Sans Arabic via `next/font`, self-hosted at build time, in
  one stack. Onest has no Arabic glyphs, so Arabic falls through to Noto per character while
  Latin text and digits stay in Onest in both languages.
- **i18n with next-intl, locale in the URL** (`/en/…`, `/ar/…`, `localePrefix: "always"`).
  A cookie-based locale would make every page read cookies and lose its static shell under
  Cache Components; with `[locale]` + `generateStaticParams` + `setRequestLocale`, all pages are
  partially prerendered in both languages. The proxy runs auth first and then next-intl;
  locale-less paths redirect by cookie or `Accept-Language`. Sign-in callbacks keep the locale.
- **RTL:** `<html dir>` comes from the locale, and layout uses logical properties only
  (`ms-`, `ps-`, `start-`, `border-e`, `text-start`). A unit test scans every component and
  stylesheet and fails on physical left/right utilities or properties. Directional icons
  (sign out) mirror with `rtl:-scale-x-100`; emails and passwords stay `dir="ltr"`.
- **Shell:** navy sidebar on the inline-start side on large screens; below `lg` it becomes a
  native `<dialog>` drawer (focus trap, Escape, inert background for free). Icon buttons are
  44px on small screens. The user menu reads the session behind `<Suspense>`.
- **Translations are checked:** a test asserts Arabic and English have the same keys and the same
  `{placeholders}`. Sign-in validation errors are translation keys, resolved in the form.

### Alternatives considered

- **next-themes.** Does the same with more surface; the inline script is 200 bytes.
- **Locale from a cookie only (no URL prefix).** Cleaner URLs, but dynamic rendering for every
  page and links that can't be shared per language.
- **IBM Plex Sans Arabic** for Arabic. Close in tone; Noto Sans Arabic was the skill's
  highest-ranked Arabic sans and has a wider weight range.

## 008 — Overview dashboard: data fetching, charts and a sign-out race

**Date:** 2026-11-07 · **Phase:** 4

### Decision

- **TanStack Query on the client** (`QueryProvider` in the signed-in layout). The page shell and
  a skeleton prerender; `/api/summary?months=3|6|12` loads in the browser and stays cached for a
  minute, with the previous range kept on screen (dimmed, `aria-busy`) while a new one loads.
  4xx errors are not retried; an inline alert offers a retry.
- **`months` on the summary API.** The window is anchored to the latest transaction, so "last 3
  months" is meaningful for seeded data. **Comparisons are only shown when the previous period
  is fully inside the history**; otherwise `previousKpis` is `null` and the tiles say there is
  nothing to compare, instead of "+106% income" against a half-empty year.
- **Forms by job (dataviz method):** KPIs are stat tiles (not charts) with direction-aware deltas
  (higher spending is "worse") carried by an arrow and screen-reader text, not colour alone;
  cash flow is grouped bars, two series on one axis, with a legend and an `sr-only` table;
  categories are sorted single-hue bars with values written beside them, folding the tail into
  "Other"; daily spending is a calendar heatmap on a one-hue sequential ramp.
- **Chart colours are validated, not picked by eye.** Income blue `#2a78d6` and spending gold
  `#c98500` (dark: `#3987e5` / `#c98500`) pass the palette checks (CVD separation, lightness band,
  3:1 against the surface) in both themes, and keep the navy/gold identity. Green and red stay
  reserved for good/bad deltas.
- **D3 for the heatmap's maths, React for its DOM.** `buildCalendar` (pure, tested) lays out every
  day Sunday-first and quantizes amounts on a square-root scale so a few large days (rent,
  travel) don't flatten the rest. Recharts for the bar chart.
- **RTL charts.** SVG `text-anchor` follows the inherited direction, which pushed labels outside
  the plot in Arabic. Plots are drawn in LTR coordinates (`dir="ltr"` on the chart container) and
  mirrored explicitly: reversed x-axis, value axis on the right, heatmap weeks flowing right to
  left. Arabic keeps Latin digits (`ar-JO-u-nu-latn`).
- **Sign-out race (bug found by the new tests).** Auth.js's middleware wrapper re-issues the
  session cookie on every request. A dashboard request still in flight during sign-out set the
  cookie again after sign-out cleared it, silently signing the user back in. The proxy now only
  reads the token (`getToken`: decrypt and check expiry) and never writes cookies; sessions have a
  fixed 8-hour lifetime from sign-in.
- **The user menu calls `connection()`** before reading the session, so partial prefetches don't
  run Auth.js's crypto during a prerender.
