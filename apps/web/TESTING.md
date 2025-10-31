# Testing Guide

This document explains how to set up and run tests for the FROK web application.

## Test Setup

### Prerequisites

1. **Node.js 18+** installed
2. **pnpm** package manager
3. **Test user account** in Supabase

### Initial Setup

1. **Install dependencies**:
   ```bash
   cd apps/web
   pnpm install
   ```

2. **Create test environment file**:
   ```bash
   cp .env.test.example .env.test
   ```

3. **Configure test credentials**:
   Edit `.env.test` with your test user credentials:
   ```bash
   TEST_USER_EMAIL=your-test-user@example.com
   TEST_USER_PASSWORD=your-test-password
   PLAYWRIGHT_BASE_URL=http://localhost:3000
   ```

### Creating a Test User

You need a real user in your Supabase database for E2E tests:

**Option 1: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Add user"
4. Create a user with email and password
5. Use those credentials in `.env.test`

**Option 2: Via Sign-Up Flow**
1. Run the development server: `pnpm run dev`
2. Navigate to `http://localhost:3000/auth/sign-in`
3. Sign up with a new account
4. Use those credentials in `.env.test`

## Running Tests

### E2E Tests (Playwright)

**Run all E2E tests**:
```bash
pnpm run test:e2e
```

**Run E2E tests with UI mode** (recommended for debugging):
```bash
pnpm run test:e2e:ui
```

**Run E2E tests in headed mode** (see browser):
```bash
pnpm run test:e2e:headed
```

**Run E2E tests in debug mode**:
```bash
pnpm run test:e2e:debug
```

**Run E2E tests for specific browser**:
```bash
pnpm run test:e2e:chromium
pnpm run test:e2e:firefox
pnpm run test:e2e:webkit
```

**View test report**:
```bash
pnpm run test:e2e:report
```

### Unit Tests (Vitest)

**Run all unit tests**:
```bash
pnpm run test
```

**Run unit tests in watch mode**:
```bash
pnpm run test:watch
```

**Run unit tests with UI**:
```bash
pnpm run test:ui
```

**Run unit tests once (CI mode)**:
```bash
pnpm run test:run
```

**Run unit tests with coverage**:
```bash
pnpm run test:coverage
```

## Test Structure

### E2E Tests (`e2e/tests/`)

- `homepage.spec.ts` - Homepage loading and navigation
- `auth.spec.ts` - Authentication flows (sign-in, sign-out)
- `navigation.spec.ts` - Navigation between pages
- `chat.spec.ts` - Chat/thread functionality
- `agent.spec.ts` - Agent interactions and memory

### Unit Tests (`src/__tests__/`)

- `components/Button.test.tsx` - Button component tests
- `components/Input.test.tsx` - Input component tests
- `components/ConfirmDialog.test.tsx` - Dialog component tests

## Authentication in Tests

### How It Works

1. **Setup Phase**: Before tests run, `e2e/auth.setup.ts` signs in and saves authenticated state to `.auth/user.json`
2. **Test Phase**: All browser projects (Chromium, Firefox, WebKit) load the saved authentication state
3. **Benefit**: Tests don't need to sign in each time - they start authenticated

### Auth State Management

The authenticated state is stored in `.auth/user.json` and includes:
- Cookies
- Local storage
- Session storage

This file is **git-ignored** for security.

### Debugging Auth Issues

If tests fail due to authentication:

1. **Check credentials**:
   ```bash
   cat .env.test
   ```

2. **Verify test user exists** in Supabase dashboard

3. **Run auth setup manually**:
   ```bash
   pnpm playwright test --project=setup
   ```

4. **Check auth state file**:
   ```bash
   cat .auth/user.json
   ```

5. **Clear auth state and re-authenticate**:
   ```bash
   rm -rf .auth
   pnpm run test:e2e
   ```

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/some-page');
    await page.waitForLoadState('networkidle');

    // Interact with page
    const button = page.getByRole('button', { name: /click me/i });
    await button.click();

    // Assert result
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Unit Test Template

```typescript
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Test Coverage

### Current Coverage

**E2E Tests**: 19 tests
- ✅ 7 passing (homepage, navigation, auth basics)
- 🚧 12 enabled (chat, agent, authenticated flows)

**Unit Tests**: 29 tests
- ✅ 20 passing (Button, Input components)
- ⏭️ 9 skipped (ConfirmDialog - React version mismatch)

### Coverage Goals

- E2E: Cover all critical user flows (auth, chat, agent)
- Unit: Cover all reusable components in `@frok/ui`
- Integration: Cover API routes with request validation

## CI/CD Integration

### GitHub Actions

The test suite is integrated into the CI pipeline at `.github/workflows/ci.yml`. Tests run on:
- Every push to `main` branch
- Every pull request to `main` branch

**Test Steps in CI**:
1. **Unit Tests** - Fast component and utility tests with Vitest
2. **Coverage Tests** - Unit tests with coverage reporting (60% threshold)
3. **E2E Tests** - Full browser automation tests with Playwright (Chromium only in CI)
4. **Build Verification** - Ensures production build succeeds

**Required GitHub Secrets**:
```
TEST_USER_EMAIL             - Test user email for E2E authentication
TEST_USER_PASSWORD          - Test user password for E2E authentication
NEXT_PUBLIC_SUPABASE_URL    - Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key
```

**Artifacts Uploaded**:
- `playwright-report/` - E2E test results and screenshots (30 day retention)
- `coverage/` - Unit test coverage reports (30 day retention)

### Coverage Thresholds

Coverage thresholds are enforced in CI:
- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 60%
- **Statements**: 60%

Tests will fail if coverage drops below these thresholds. You can view coverage reports:
- Locally: `pnpm run test:coverage` then open `coverage/index.html`
- CI: Download coverage artifact from GitHub Actions

## Troubleshooting

### Common Issues

#### Issue: "TEST_USER_EMAIL is not set"
**Solution**: Create `.env.test` file with test credentials

#### Issue: "Authentication failed"
**Solutions**:
- Verify test user exists in Supabase
- Check credentials in `.env.test` are correct
- Ensure Supabase project is running

#### Issue: "Target page, context or browser has been closed"
**Solutions**:
- Increase timeout in test
- Check for JavaScript errors in browser console
- Run with `--headed` flag to see what's happening

#### Issue: Tests timing out
**Solutions**:
- Increase timeout: `test.setTimeout(60000)`
- Check network connectivity
- Verify dev server is running

#### Issue: "Cannot find module '@testing-library/react'"
**Solution**: Install dependencies:
```bash
pnpm install
```

## Best Practices

### E2E Tests

1. **Use role-based selectors**: `getByRole('button', { name: /submit/i })`
2. **Wait for network idle**: `await page.waitForLoadState('networkidle')`
3. **Use flexible selectors**: Test multiple possible elements
4. **Don't test implementation details**: Test user behavior
5. **Keep tests independent**: Each test should work standalone

### Unit Tests

1. **Test behavior, not implementation**: What the component does, not how
2. **Use Testing Library queries**: `getByRole`, `getByLabelText`, etc.
3. **Avoid snapshot tests**: They break often and provide little value
4. **Test edge cases**: Empty states, errors, loading states
5. **Keep tests fast**: Mock slow operations

## Performance

### Speed Optimization

- **E2E**: Tests run in parallel across 3 browsers
- **Unit**: Tests run in parallel with Vitest
- **Auth**: Reuse authentication state (no sign-in per test)
- **Dev Server**: Reuse existing server (don't restart)

### Typical Run Times

- E2E tests: ~30-60 seconds (first run with auth setup)
- E2E tests: ~20-30 seconds (subsequent runs)
- Unit tests: ~5-10 seconds

## Resources

### Documentation

- [Playwright Docs](https://playwright.dev/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)

### Useful Commands

```bash
# Install Playwright browsers
pnpx playwright install

# Update Playwright
pnpm add -D @playwright/test@latest

# Update Vitest
pnpm add -D vitest@latest

# Clear all test artifacts
rm -rf test-results/ playwright-report/ coverage/ .auth/
```

## Contributing

When adding new features:

1. **Write E2E test** for user-facing functionality
2. **Write unit tests** for reusable components
3. **Update this guide** if adding new test patterns
4. **Run full test suite** before submitting PR:
   ```bash
   pnpm run test:run && pnpm run test:e2e
   ```
