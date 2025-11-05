# FROK

Monorepo for our multi-agent services and web app.

## Overview

- **Package manager:** pnpm workspaces + Turbo
- **Node:** 22.11.0 (pinned via `.nvmrc`)
- **Web:** Next.js 15.5.4, React 19.1.0, Tailwind CSS 4.1.14
- **API:** Fastify 5 (TypeScript)
- **Python:** Optional venv in `.venv` (3.12)

## Monorepo layout

- `apps/web` — Next.js app
- `apps/api` — Fastify API
- `packages/*` — Shared libraries (e.g. `@frok/clients`, `@frok/types`, `@frok/db`)
- `services/*` — Long-running or domain services (e.g. `agents`)
- `infra/scripts/` — Setup & dev scripts

## Quick start (Windows, PowerShell)

```powershell
.\infra\scripts\check-setup.ps1
.\infra\scripts\bootstrap.ps1
pnpm install
pnpm dev        # start all apps
# or
pnpm dev:web    # web only → http://localhost:3000
pnpm dev:api    # api only
```

## Dev scripts

- `pnpm lint` — lint across workspaces
- `pnpm typecheck` — TypeScript checks
- `.\infra\scripts\dev.ps1` — prepare dev shell (Node + optional venv)
- `.\scripts\dev-reset.ps1` — kill Node, free ports, clear Next cache

## Web app specifics

- `apps/web/tsconfig.json` sets `baseUrl: "src"` and alias `@/*` → `src/*`
- Import shared clients via `@frok/clients` (workspace alias)

## Links

- [`docs/guides/QUICKSTART.md`](docs/guides/QUICKSTART.md) — cheat sheet
- [`docs/guides/SETUP_GUIDE.md`](docs/guides/SETUP_GUIDE.md) — full setup guide
