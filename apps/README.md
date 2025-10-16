# apps

Monorepo applications.

## Apps

- **web** — Next.js 15.5.4 (React 19.1.0, Tailwind 4.1.14)
- **api** — Fastify 5 (TypeScript)

## Commands (pnpm)

```powershell
# dev (all)
pnpm dev

# dev (single)
pnpm dev:web
pnpm dev:api

# build / lint / typecheck (targeted)
pnpm -F @frok/web build
pnpm -F @frok/web lint
pnpm -F @frok/web typecheck
pnpm -F @frok/api typecheck
```

## Notes

- `apps/web/tsconfig.json` uses `baseUrl: "src"` and alias `@/*`.
- Shared libs are under `packages/*` and imported via workspace aliases.
