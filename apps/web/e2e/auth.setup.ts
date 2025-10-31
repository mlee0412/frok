/**
 * Playwright Authentication Setup
 *
 * This script runs before tests to authenticate and save the auth state.
 * Tests can then reuse the authenticated state without signing in each time.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Get test user credentials from environment variables
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'testpassword123';

  console.log(`[Auth Setup] Attempting to sign in with email: ${email}`);

  // Navigate to sign-in page
  await page.goto('/auth/sign-in');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in the sign-in form
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Click sign-in button
  await submitButton.click();

  // Wait for navigation after sign-in
  // The app should redirect to dashboard or home after successful sign-in
  await page.waitForURL(/\/(dashboard|agent)/, { timeout: 10000 }).catch(async () => {
    // If redirect doesn't happen, check if we're still on sign-in page
    const currentUrl = page.url();
    console.warn(`[Auth Setup] Still on URL: ${currentUrl} after sign-in attempt`);

    // Check for error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red').allTextContents();
    if (errorMessages.length > 0) {
      console.error(`[Auth Setup] Error messages found: ${errorMessages.join(', ')}`);
    }

    throw new Error('Sign-in failed - did not redirect to dashboard');
  });

  console.log(`[Auth Setup] Successfully signed in, redirected to: ${page.url()}`);

  // Wait a bit more to ensure cookies are set
  await page.waitForTimeout(1000);

  // Verify we're authenticated by checking for user-specific elements
  // This could be a profile menu, sign-out button, or user email display
  const isAuthenticated = await page.locator('[data-testid="user-menu"], .user-profile, button:has-text("Sign out")').count() > 0;

  if (!isAuthenticated) {
    console.warn('[Auth Setup] Could not verify authentication state');
  }

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`[Auth Setup] Saved authentication state to ${authFile}`);
});
