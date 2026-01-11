import { test, expect } from '@playwright/test';
import { registerUser, getGuilds, getGuildChannels, createGuild } from './helpers/api-helpers';

test.describe('Critical User Flow: Login → Guild → Message', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!',
  };

  test('should complete full flow: register, login, create guild, send message', async ({ page }) => {
    // Step 1: Register user via API (faster than UI)
    console.log('Registering test user via API...');
    const { accessToken } = await registerUser(
      testUser.email,
      testUser.username,
      testUser.password
    );
    expect(accessToken).toBeTruthy();
    console.log('User registered successfully');

    // Step 2: Navigate to login page
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Step 3: Fill login form
    await page.fill('input[id="emailOrUsername"]', testUser.email);
    await page.fill('input[id="password"]', testUser.password);

    // Step 4: Submit login form
    await page.click('button[type="submit"]');

    // Step 5: Wait for redirect to /me (home page after login)
    await page.waitForURL(/\/me/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/me/);
    console.log('Login successful, redirected to /me');

    // Step 6: Wait for page to load (check for guild sidebar or create guild button)
    await page.waitForLoadState('networkidle');

    // Step 7: Create guild via API (ensures same token is used)
    // This avoids token mismatch issues between UI login and API calls
    const guildName = `Test Guild ${Date.now()}`;
    console.log(`Creating guild via API: ${guildName}`);
    const createdGuild = await createGuild(accessToken, guildName);
    expect(createdGuild).toBeTruthy();
    expect(createdGuild.id).toBeTruthy();
    const guildId = createdGuild.id;
    console.log(`Guild created with ID: ${guildId}`);

    // Step 8: Wait a bit for UI to sync (if needed)
    await page.waitForTimeout(1000);

    // Step 9: Navigate to guild (GuildView will auto-redirect to first channel)
    await page.goto(`/guilds/${guildId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for channel navigation

    // Step 10: Verify we're in a channel view (check for message composer or channel header)
    // Look for message composer textarea or channel header
    const messageComposer = page.locator('textarea').first();
    await expect(messageComposer).toBeVisible({ timeout: 10000 });
    console.log('Channel view loaded, message composer visible');

    // Step 11: Send a message
    const testMessage = `Test message ${Date.now()}`;
    await messageComposer.fill(testMessage);
    
    // Find and click send button (usually next to the textarea)
    const sendButton = page.getByRole('button').filter({ hasText: /send/i }).first();
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      // Alternative: Press Enter to send
      await messageComposer.press('Enter');
    }

    // Step 12: Wait for message to appear in message list
    await page.waitForTimeout(1000); // Give time for message to be sent and appear

    // Step 13: Verify message appears in the list
    // Look for the message content in the page
    const messageElement = page.getByText(testMessage).first();
    await expect(messageElement).toBeVisible({ timeout: 10000 });
    console.log('Message sent and verified in message list');

    // Step 14: Verify message has correct author info (optional)
    // The message should be associated with the test user
    // This might require checking the message structure in the UI
  });

  test.afterEach(async () => {
    // Cleanup: Test data will be cleaned up by Docker Compose teardown
    // (fresh database on each test run)
  });
});
