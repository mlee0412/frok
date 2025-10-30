import { test, expect } from '@playwright/test';

test.describe('Agent Interactions', () => {
  test('should load agent page', async ({ page }) => {
    await page.goto('/agent');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Check we're on the right page or redirected to auth
    await expect(page).toHaveURL(/\/(agent|auth\/sign-in)/);
  });

  test.skip('should open memory modal', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Look for memory button (various possible labels)
    const memoryButton = page.getByRole('button', { name: /memory|memories|knowledge/i });

    if (await memoryButton.count() > 0) {
      await memoryButton.first().click();

      // Check modal opened
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal.first()).toBeVisible();
    }
  });

  test.skip('should display agent memories', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Open memory modal
    const memoryButton = page.getByRole('button', { name: /memory/i });
    await memoryButton.first().click();

    // Wait for memories to load
    await page.waitForTimeout(1000);

    // Check for memory list or empty state
    const memoryList = page.locator('[data-testid="memory-list"], .memory-list');
    const emptyState = page.getByText(/no memories|empty/i);

    expect(
      (await memoryList.count() > 0) || (await emptyState.count() > 0)
    ).toBeTruthy();
  });

  test.skip('should add new memory', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Open memory modal
    const memoryButton = page.getByRole('button', { name: /memory/i });
    await memoryButton.first().click();

    // Click add memory button
    const addButton = page.getByRole('button', { name: /add|new memory/i });
    await addButton.click();

    // Fill in memory details
    const contentInput = page.locator('textarea, input').first();
    await contentInput.fill('Test memory content');

    // Save
    const saveButton = page.getByRole('button', { name: /save|add/i });
    await saveButton.click();

    // Verify memory was added
    await page.waitForTimeout(1000);
    await expect(page.getByText('Test memory content')).toBeVisible();
  });

  test.skip('should use tools in conversation', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Send a message that triggers tool use
    const messageInput = page.locator('textarea').last();
    await messageInput.fill('What is the weather?');

    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for tool use indicator or response
    // This depends on how tools are displayed in the UI
  });

  test.skip('should toggle tools on/off', async ({ page }) => {
    // TODO: Implement once authentication is working
    await page.goto('/agent');

    // Look for tools toggle
    const toolsToggle = page.getByRole('switch', { name: /tools|enable tools/i });

    if (await toolsToggle.count() > 0) {
      // Toggle off
      await toolsToggle.click();
      await page.waitForTimeout(500);

      // Toggle back on
      await toolsToggle.click();
    }
  });
});
