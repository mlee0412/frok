# packages

Shared libraries for the monorepo.

## Modules

- @frok/clients — HTTP/SDK clients (exports `src/index.ts`)
- @frok/db — Database-related utilities (stub)
- @frok/types — Shared TypeScript types
- @frok/config — Base tsconfig and shared configs

## Path aliases

Maintained in root [tsconfig.base.json](cci:7://file:///c:/Dev/FROK/tsconfig.base.json:0:0-0:0):

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@frok/clients": ["packages/clients/src/index.ts"],
      "@frok/clients/*": ["packages/clients/src/*"],
      "@frok/types/*": ["packages/types/src/*"],
      "@frok/config/*": ["packages/config/src/*"],
      "@frok/db/*": ["packages/db/src/*"]
      // add more as you create them
    }
  }
}
```
