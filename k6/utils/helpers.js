// K6 Helper Functions

import http from 'k6/http';
import { check } from 'k6';
import { config } from './config.js';

/**
 * Generate unique test user credentials per Virtual User
 */
export function generateTestUser(vu, iter) {
  const timestamp = Date.now();
  const uniqueId = `${vu}_${iter}_${timestamp}`;
  
  return {
    username: `${config.testUserPrefix}_${uniqueId}`,
    email: `${config.testUserPrefix}_${uniqueId}@loadtest.local`,
    password: 'LoadTestPassword123!',
  };
}

/**
 * Register and login a user, returning the access token
 */
export function authenticateUser(user) {
  const baseUrl = config.apiBaseUrl;
  
  // Register
  const registerPayload = JSON.stringify({
    username: user.username,
    email: user.email,
    password: user.password,
  });
  
  const registerParams = {
    headers: { 
      'Content-Type': 'application/json',
      'X-Load-Test': 'true'  // Bypass rate limiting for load tests
    },
  };
  
  const registerRes = http.post(`${baseUrl}/api/auth/register`, registerPayload, registerParams);
  
  const registerSuccess = check(registerRes, {
    'register status is 201': (r) => r.status === 201,
    'register has token': (r) => r.json('accessToken') !== undefined,
  });
  
  if (!registerSuccess) {
    // Log error details for debugging (only first few errors to avoid spam)
    if (__VU <= 3 && __ITER === 0) {
      console.error(`[VU ${__VU}] Register failed: status=${registerRes.status}, error=${registerRes.error || 'none'}, body=${registerRes.body?.substring(0, 200) || 'empty'}, url=${baseUrl}/api/auth/register`);
    }
    // If registration fails, try login (user might already exist)
    const loginPayload = JSON.stringify({
      emailOrUsername: user.email,
      password: user.password,
    });
    
    const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, registerParams);
    
    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => r.json('accessToken') !== undefined,
    });
    
    if (!loginSuccess) {
      // Log error details for debugging (only first few errors to avoid spam)
      if (__VU <= 3 && __ITER === 0) {
        console.error(`[VU ${__VU}] Login failed: status=${loginRes.status}, error=${loginRes.error || 'none'}, body=${loginRes.body?.substring(0, 200) || 'empty'}, url=${baseUrl}/api/auth/login`);
      }
      return null;
    }
    
    return {
      accessToken: loginRes.json('accessToken'),
      refreshToken: loginRes.json('refreshToken'),
    };
  }
  
  return {
    accessToken: registerRes.json('accessToken'),
    refreshToken: registerRes.json('refreshToken'),
  };
}

/**
 * Create a test guild and return guild data
 */
export function createTestGuild(accessToken) {
  const baseUrl = config.apiBaseUrl;
  
  const guildPayload = JSON.stringify({
    name: `LoadTest Guild ${Date.now()}`,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Load-Test': 'true'  // Bypass rate limiting for load tests
    },
  };
  
  const res = http.post(`${baseUrl}/api/guilds`, guildPayload, params);
  
  const success = check(res, {
    'create guild status is 201': (r) => r.status === 201,
    'guild has id': (r) => r.json('id') !== undefined,
  });
  
  if (!success) {
    return null;
  }
  
  return res.json();
}

/**
 * Get default "general" text channel from a guild
 */
export function getDefaultChannel(accessToken, guildId) {
  const baseUrl = config.apiBaseUrl;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Load-Test': 'true'  // Bypass rate limiting for load tests
    },
  };
  
  const res = http.get(`${baseUrl}/api/guilds/${guildId}/channels`, params);
  
  const success = check(res, {
    'get channels status is 200': (r) => r.status === 200,
    'channels is array': (r) => Array.isArray(r.json()),
  });
  
  if (!success) {
    return null;
  }
  
  const channels = res.json();
  // Find "general" channel or first text channel
  const generalChannel = channels.find(c => c.name === 'general' && c.type === 0);
  if (generalChannel) {
    return generalChannel;
  }
  
  // Fallback to first text channel
  const textChannel = channels.find(c => c.type === 0);
  return textChannel || null;
}

/**
 * Get voice channel from a guild
 */
export function getVoiceChannel(accessToken, guildId) {
  const baseUrl = config.apiBaseUrl;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Load-Test': 'true'  // Bypass rate limiting for load tests
    },
  };
  
  const res = http.get(`${baseUrl}/api/guilds/${guildId}/channels`, params);
  
  const success = check(res, {
    'get channels status is 200': (r) => r.status === 200,
    'channels is array': (r) => Array.isArray(r.json()),
  });
  
  if (!success) {
    return null;
  }
  
  const channels = res.json();
  // Find first voice channel (type 1)
  const voiceChannel = channels.find(c => c.type === 1);
  return voiceChannel || null;
}
