/**
 * API helper functions for E2E tests
 */

const API_BASE_URL = 'http://localhost:5049/api';

/**
 * Register a new user via API
 */
export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
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
    throw new Error(`Registration failed: ${error}`);
  }

  return await response.json();
}

/**
 * Login user via API
 */
export async function loginUser(
  emailOrUsername: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emailOrUsername,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get current user info (requires auth token)
 */
export async function getCurrentUser(
  accessToken: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get current user: ${error}`);
  }

  return await response.json();
}

/**
 * Create a guild (requires auth token)
 */
export async function createGuild(
  accessToken: string,
  name: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guilds`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create guild: ${error}`);
  }

  return await response.json();
}

/**
 * Get user's guilds (requires auth token)
 */
export async function getGuilds(
  accessToken: string
): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/guilds`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get guilds: ${error}`);
  }

  return await response.json();
}

/**
 * Get guild channels (requires auth token)
 */
export async function getGuildChannels(
  accessToken: string,
  guildId: string
): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/guilds/${guildId}/channels`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get channels: ${error}`);
  }

  return await response.json();
}

/**
 * Send a message to a channel (requires auth token)
 */
export async function sendMessage(
  accessToken: string,
  channelId: string,
  content: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }

  return await response.json();
}
