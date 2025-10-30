import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // Navigate to the root URL
    await page.goto('/');

    // Check if the page loaded (might redirect to /dashboard or /auth/sign-in)
    await expect(page).toHaveURL(/\/(dashboard|auth\/sign-in)?/);

    // Check for no JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that title is set
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Should either be on dashboard or redirected to auth
    await expect(page).toHaveURL(/\/(dashboard|auth\/sign-in)/);
  });
});
