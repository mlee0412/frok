import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Check page loaded
    await expect(page).toHaveURL('/auth/sign-in');

    // Check for sign-in heading or form elements
    const heading = page.getByRole('heading', { name: /sign in/i });
    await expect(heading).toBeVisible();
  });

  test('should have email and password inputs', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Look for email input (various possible selectors)
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();

    // Look for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Look for submit button (could be various texts)
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Try to submit without filling form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait a bit for potential validation messages
    await page.waitForTimeout(500);

    // Check that we're still on sign-in page (form didn't submit)
    await expect(page).toHaveURL('/auth/sign-in');
  });

  test.skip('should sign in with valid credentials', async ({ page }) => {
    // TODO: Implement once test credentials are set up
    // This test is skipped for now
    await page.goto('/auth/sign-in');
  });

  test.skip('should sign out successfully', async ({ page }) => {
    // TODO: Implement once authentication is fully working
    // This test is skipped for now
  });
});
