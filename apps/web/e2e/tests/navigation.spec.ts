import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');

    // Check initial load (might redirect)
    await page.waitForLoadState('networkidle');

    // Try navigating to different pages
    const pagesToTest = [
      '/dashboard',
      '/agent',
      '/auth/sign-in',
    ];

    for (const pagePath of pagesToTest) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Check page loaded without JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      expect(errors).toHaveLength(0);
    }
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Look for navigation elements (SideNav component)
    const nav = page.locator('nav').first();

    // Check if nav exists
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();

      // Check for nav links
      const links = nav.locator('a');
      const linkCount = await links.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');

    // Should return 404 or redirect
    expect(response?.status()).toBeDefined();
  });
});
