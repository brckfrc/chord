// Guild Management Flow Scenario
// Tests: Create Guild → List Guilds → Get Guild Details

import http from 'k6/http';
import { check } from 'k6';
import { config } from '../utils/config.js';
import { createTestGuild } from '../utils/helpers.js';

export function guildFlow(accessToken) {
  const baseUrl = config.apiBaseUrl;
  
  if (!accessToken) {
    return null;
  }
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  // Create a guild
  const guildPayload = JSON.stringify({
    name: `LoadTest Guild ${__VU}_${__ITER}_${Date.now()}`,
  });
  
  const createRes = http.post(`${baseUrl}/api/guilds`, guildPayload, params);
  
  const createSuccess = check(createRes, {
    'create guild status is 201': (r) => r.status === 201,
    'guild has id': (r) => r.json('id') !== undefined,
    'guild has name': (r) => r.json('name') !== undefined,
  });
  
  if (!createSuccess) {
    return null;
  }
  
  const guildId = createRes.json('id');
  
  // List user's guilds
  const listRes = http.get(`${baseUrl}/api/guilds`, params);
  
  check(listRes, {
    'list guilds status is 200': (r) => r.status === 200,
    'list guilds is array': (r) => Array.isArray(r.json()),
    'list guilds contains created guild': (r) => {
      const guilds = r.json();
      return guilds.some(g => g.id === guildId);
    },
  });
  
  // Get guild details
  const getRes = http.get(`${baseUrl}/api/guilds/${guildId}`, params);
  
  check(getRes, {
    'get guild status is 200': (r) => r.status === 200,
    'get guild has id': (r) => r.json('id') === guildId,
    'get guild has channels': (r) => Array.isArray(r.json('channels')),
  });
  
  return {
    guildId,
    guild: getRes.json(),
  };
}
