import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Auth fixture that handles authentication state
 */
export type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to sign-in page
    await page.goto('/auth/sign-in');

    // TODO: Add actual sign-in logic once we have test credentials
    // For now, this is a placeholder for the authenticated state
    // await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    // await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    // await page.click('button[type="submit"]');
    // await page.waitForURL('/dashboard');

    await use(page);
  },
});

export { expect };
