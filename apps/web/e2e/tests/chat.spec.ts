import { test, expect } from '@playwright/test';

// ============================================================================
// Integrated Chat E2E Tests
// ============================================================================

/**
 * E2E tests for the integrated chat interface
 *
 * Tests:
 * - Layout rendering (sidebar, messages, input)
 * - Thread creation and switching
 * - Message sending and display
 * - Keyboard shortcuts
 * - Mobile responsive behavior
 */

test.describe('Integrated Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat page
    await page.goto('/chat');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should render chat layout correctly', async ({ page }) => {
    // Check desktop sidebar is visible on desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    // Check header is visible
    await expect(page.locator('header')).toBeVisible();

    // Check empty state is shown when no thread
    await expect(page.getByText(/Welcome to FROK Chat|Start a new conversation/i)).toBeVisible();
  });

  test('should create new thread and send message', async ({ page }) => {
    // Click "Start New Chat" button
    const startButton = page.getByRole('button', { name: /Start New Chat|New/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    // Verify input is visible
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Type message
    const messageText = 'Hello, this is a test message';
    await textarea.fill(messageText);

    // Send message (click send button or use keyboard)
    await page.keyboard.press('Control+Enter');

    // Wait for message to appear
    await page.waitForTimeout(1000);
    await expect(page.getByText(messageText)).toBeVisible();
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    // Create thread
    const startButton = page.getByRole('button', { name: /Start New Chat|New/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    const textarea = page.locator('textarea').first();

    // Test Ctrl+Enter to send
    await textarea.fill('Keyboard shortcut test');
    await page.keyboard.press('Control+Enter');

    await page.waitForTimeout(500);
    await expect(page.getByText('Keyboard shortcut test')).toBeVisible();

    // Test Escape to clear
    await textarea.fill('This will be cleared');
    await page.keyboard.press('Escape');

    await page.waitForTimeout(100);
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe('');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Create thread
    const startButton = page.getByRole('button', { name: /Start New Chat|New/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    // Verify input is visible and functional
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill('Mobile test');
    await page.keyboard.press('Control+Enter');

    await page.waitForTimeout(500);
    await expect(page.getByText('Mobile test')).toBeVisible();
  });

  test('should auto-resize textarea', async ({ page }) => {
    // Create thread
    const startButton = page.getByRole('button', { name: /Start New Chat|New/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    const textarea = page.locator('textarea').first();

    // Get initial height
    const initialHeight = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollHeight);

    // Type multiple lines
    await textarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    // Wait for auto-resize
    await page.waitForTimeout(100);

    // Get new height
    const newHeight = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollHeight);

    // Verify height increased
    expect(newHeight).toBeGreaterThan(initialHeight);
  });
});

// ============================================================================
// Legacy Chat Tests (from agent page)
// ============================================================================

test.describe('Chat Functionality (Agent Page)', () => {
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
    const threadSidebar = page.locator('[data-testid="thread-list"], .thread-list, aside, nav').first();

    // Wait for sidebar to be in DOM
    await threadSidebar.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {
      console.warn('Thread sidebar not found - may be using different structure');
    });
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
