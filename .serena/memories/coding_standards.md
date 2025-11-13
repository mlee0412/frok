# FROK Coding Standards

## TypeScript
- **Never use `any`** - Use `unknown` for truly unknown types
- Named exports only (no default exports)
- Import database types from `@/types/database`
- Run `pnpm typecheck` before committing

## Component Patterns
- **Always import from `@frok/ui`** for Button, Input, Card, Modal, etc.
- Use `'use client'` directive for client components
- Server components for data fetching (default in Next.js 15)
- Forward refs with `forwardRef<HTMLElement, Props>`

## Styling (CRITICAL)
**Always use CSS variables** - Never hardcode colors

Semantic tokens from `packages/ui/styles/tokens.css`:
- Layout: `bg-background`, `bg-surface`, `border-border`
- Text: `text-foreground`, `text-foreground/70`, `text-foreground/60`
- Semantic: `text-primary`, `text-danger`, `text-warning`, `text-success`, `text-info`, `text-accent`

**NEVER use**: `gray-*`, `red-*`, `blue-*`, `sky-*`, `green-*`, `yellow-*`

## API Routes
All routes MUST have:
1. Rate limiting: `withRateLimit('ai' | 'standard' | 'read')`
2. Authentication: `withAuth(req)`
3. Validation: `withValidation(schema)(req)`
4. Error handling: try/catch with `errorHandler.logError()`

## State Management
- **Zustand**: Global client state with persistence
- **TanStack Query**: Server data fetching, caching
- **useState**: Component-local UI state
- **URL State**: Filters, pagination (useURLState)

## Accessibility
- All interactive elements need accessible names (aria-label)
- Modals: role="dialog", aria-modal, aria-labelledby
- Focus management with focus trap
- Keyboard navigation (Tab, Escape, Enter, arrows)