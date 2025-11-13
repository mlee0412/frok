# Suggested Commands for FROK Development

## Development
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start all apps in dev mode
pnpm dev:web              # Start web app only (:3000)
pnpm dev:api              # Start API server only
```

## Testing (CRITICAL before commits!)
```bash
pnpm typecheck            # TypeScript compilation (MUST PASS)
pnpm test                 # Unit tests with Vitest
pnpm test:e2e             # E2E tests with Playwright
pnpm test:coverage        # Coverage report (60% threshold)
pnpm build                # Production build verification
```

## Building
```bash
pnpm build                # Build all apps
pnpm build:web            # Build web app only
pnpm build:analyze        # Analyze bundle size
```

## Package Management
```bash
pnpm -F @frok/ui add <pkg>      # Add to ui package
pnpm -F apps/web add <pkg>      # Add to web app
```

## Git Commands (Windows)
```powershell
git status                # Check status
git add .                 # Stage all changes
git commit -m "message"   # Commit with message
git push origin main      # Push to main (triggers Vercel deploy)
```

## Windows-Specific Utils
```powershell
dir                       # List files (ls equivalent)
cd path                   # Change directory
findstr /s /i "text" *    # Search files (grep equivalent)
type file.txt             # View file content (cat equivalent)
```