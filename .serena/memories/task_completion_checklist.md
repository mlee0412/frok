# Task Completion Checklist

Before marking ANY task as complete:

## 1. Code Quality
- [ ] Run `pnpm typecheck` - MUST PASS with 0 errors
- [ ] Run `pnpm test` - All tests passing
- [ ] Fix any TypeScript errors
- [ ] Use CSS variables (no hardcoded colors)
- [ ] Import components from `@frok/ui`
- [ ] Use named exports only

## 2. Testing
- [ ] Unit tests added/updated (Vitest)
- [ ] E2E tests added/updated (Playwright) if UI changes
- [ ] Maintain 60% coverage threshold
- [ ] Test on mobile and desktop viewports

## 3. Security & Validation
- [ ] API routes have authentication (`withAuth`)
- [ ] API routes have validation (`withValidation`)
- [ ] API routes have rate limiting (`withRateLimit`)
- [ ] No hardcoded user IDs
- [ ] Error handling with `errorHandler.logError()`

## 4. Accessibility
- [ ] All interactive elements have accessible names
- [ ] ARIA attributes added where needed
- [ ] Keyboard navigation works
- [ ] Focus management implemented
- [ ] Color contrast meets WCAG standards

## 5. Documentation
- [ ] Update CLAUDE.md if patterns changed
- [ ] Update STATUS.md with progress
- [ ] Update session history if major work
- [ ] Add JSDoc comments for complex logic
- [ ] Update README if public API changed

## 6. Git Workflow
- [ ] Commit message follows format (feat/fix/refactor)
- [ ] Include detailed explanation
- [ ] Add Claude Code attribution
- [ ] Test locally before pushing
- [ ] Push triggers successful Vercel deployment