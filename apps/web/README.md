# @frok/web

Next.js 15 app in the FROK monorepo (React 19, Tailwind CSS 4).

## Getting Started

```powershell
# install deps (from repo root)
pnpm install

# dev (web only)
pnpm dev:web   # http://localhost:3000

# build / lint / typecheck
pnpm -F @frok/web build
pnpm -F @frok/web lint
pnpm -F @frok/web typecheck
```

## Path Aliases

- `baseUrl: "src"` — import app code with `@/...`
- Shared clients via workspace alias:
  - `@frok/clients` and `@frok/clients/*`

## Tech

- Next.js `15.5.4`, React `19.1.0`
- Tailwind CSS `4.1.14`
- State & data: `zustand`, `@tanstack/react-query`

## Notes

- App lives under `apps/web/` as part of pnpm + Turbo monorepo.
