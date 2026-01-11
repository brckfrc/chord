/**
 * Test environment setup helpers
 */

const API_BASE_URL = 'http://localhost:5049/api';

/**
 * Wait for a service to be ready by checking its health endpoint
 */
export async function waitForService(
  url: string,
  maxAttempts: number = 30,
  delayMs: number = 2000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

/**
 * Wait for backend to be ready
 */
export async function waitForBackend(): Promise<void> {
  const ready = await waitForService('http://localhost:5049/health');
  if (!ready) {
    throw new Error('Backend did not become ready within timeout');
  }
}

/**
 * Wait for frontend to be ready
 */
export async function waitForFrontend(): Promise<void> {
  const ready = await waitForService('http://localhost:5173/');
  if (!ready) {
    throw new Error('Frontend did not become ready within timeout');
  }
}

/**
 * Wait for all services to be ready
 */
export async function waitForServices(): Promise<void> {
  await waitForBackend();
  await waitForFrontend();
}

/**
 * Create a test user via API
 */
export async function createTestUser(
  email: string,
  username: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      username,
      password,
      displayName: username,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create test user: ${error}`);
  }

  return await response.json();
}

/**
 * Clean up test data (delete test user)
 * Note: This would require an admin endpoint or test-specific cleanup
 * For now, we'll rely on fresh database on each test run
 */
export async function cleanupTestData(): Promise<void> {
  // In a real scenario, you might want to:
  // 1. Delete test users
  // 2. Delete test guilds
  // 3. Clear test messages
  // For now, we rely on fresh database per test run
  console.log('Test data cleanup skipped (using fresh database)');
}
