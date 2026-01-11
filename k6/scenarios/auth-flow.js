// Authentication Flow Scenario
// Tests: Register → Login → Get Current User

import http from 'k6/http';
import { check } from 'k6';
import { config } from '../utils/config.js';
import { generateTestUser, authenticateUser } from '../utils/helpers.js';

export function authFlow() {
  const baseUrl = config.apiBaseUrl;
  
  // Generate unique user per VU
  const user = generateTestUser(__VU, __ITER);
  
  // Authenticate (register + login)
  const tokens = authenticateUser(user);
  
  if (!tokens) {
    return; // Skip rest of scenario if auth fails
  }
  
  const accessToken = tokens.accessToken;
  
  // Get current user (protected endpoint)
  const params = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  const meRes = http.get(`${baseUrl}/api/auth/me`, params);
  
  check(meRes, {
    'get me status is 200': (r) => r.status === 200,
    'get me has user id': (r) => r.json('id') !== undefined,
    'get me has username': (r) => r.json('username') !== undefined,
  });
  
  // Return tokens for use in other scenarios
  return {
    accessToken,
    refreshToken: tokens.refreshToken,
    userId: meRes.json('id'),
  };
}
