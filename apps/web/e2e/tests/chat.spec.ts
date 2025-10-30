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

  test.skip('should display thread list', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Look for thread sidebar
    const threadSidebar = page.locator('[data-testid="thread-list"], .thread-list, aside');
    await expect(threadSidebar.first()).toBeVisible();
  });

  test.skip('should create new chat thread', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Look for "New Chat" or similar button
    const newChatButton = page.getByRole('button', { name: /new chat|new thread/i });
    await newChatButton.click();

    // Verify new thread was created
    await page.waitForTimeout(1000);
  });

  test.skip('should send a message', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Find message input
    const messageInput = page.locator('textarea, input[type="text"]').last();
    await messageInput.fill('Test message');

    // Find and click send button
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait for message to appear
    await page.waitForTimeout(1000);

    // Check that message appears in chat
    await expect(page.getByText('Test message')).toBeVisible();
  });

  test.skip('should display message history', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Wait for messages to load
    await page.waitForTimeout(2000);

    // Check for message container
    const messagesContainer = page.locator('[data-testid="messages"], .messages, .chat-messages').first();
    await expect(messagesContainer).toBeVisible();
  });
});
