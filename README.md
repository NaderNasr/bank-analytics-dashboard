# Bank Analytics Dashboard

A retail banking analytics demo: transactions explorer, overview dashboard, live markets panel,
English and Arabic (RTL). Work in progress, built phase by phase. Architecture decisions are
recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Requirements

- Node.js 22+ (see `.nvmrc`)

## Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the dev server on http://localhost:3000        |
| `npm run build`     | Production build                                     |
| `npm run typecheck` | Generate route types, then `tsc --noEmit`            |
| `npm run lint`      | ESLint, zero warnings allowed                        |
| `npm run format`    | Format with Prettier (`format:check` to verify only) |
| `npm test`          | Unit and component tests (Vitest)                    |
| `npm run test:e2e`  | End-to-end tests (Playwright; builds and starts app) |

The full README (demo link, screenshots, architecture) lands in the final phase.
