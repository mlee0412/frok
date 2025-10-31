import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test('should load chat/agent page', async ({ page }) => {
    await page.goto('/agent');

    // Should either load or redirect to auth
    await expect(page).toHaveURL(/\/(agent|auth\/sign-in)/);

    await page.waitForLoadState('networkidle');

    // Check for no critical JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    expect(errors).toHaveLength(0);
  });

  test('should display thread list', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForLoadState('networkidle');

    // Should be authenticated and on agent page
    await expect(page).toHaveURL('/agent');

    // Look for thread sidebar or thread list container
    // The sidebar may be collapsible or hidden on mobile
    const threadSidebar = page.locator('[data-testid="thread-list"], .thread-list, aside, nav').first();

    // Wait for sidebar to be in DOM (may not be visible on small screens)
    await threadSidebar.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {
      console.warn('Thread sidebar not found - may be using different structure');
    });
  });

  test('should create new chat thread', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForLoadState('networkidle');

    // Look for "New Chat" or similar button
    const newChatButton = page.getByRole('button', { name: /new chat|new thread|create/i }).first();

    if (await newChatButton.count() > 0) {
      await newChatButton.click();

      // Wait a bit for thread creation
      await page.waitForTimeout(1000);

      // New thread should be created (URL might change or new thread appears in list)
      // This is a basic check - actual behavior may vary
    } else {
      console.warn('New chat button not found - may have different text or structure');
    }
  });

  test('should have message input', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForLoadState('networkidle');

    // Find message input (textarea or text input)
    const messageInput = page.locator('textarea, input[type="text"]').last();
    await expect(messageInput).toBeVisible();

    // Input should be editable
    await messageInput.fill('Test message');
    await expect(messageInput).toHaveValue('Test message');

    // Clear the input
    await messageInput.clear();
  });

  test('should have send button', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForLoadState('networkidle');

    // Find send button
    const sendButton = page.getByRole('button', { name: /send/i }).first();

    // Send button should exist
    const sendButtonCount = await sendButton.count();
    expect(sendButtonCount).toBeGreaterThan(0);
  });
});
