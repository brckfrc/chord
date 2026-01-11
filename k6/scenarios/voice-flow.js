// Voice Token Flow Scenario
// Tests: Get Voice Token

import http from 'k6/http';
import { check } from 'k6';
import { config } from '../utils/config.js';
import { getVoiceChannel } from '../utils/helpers.js';

export function voiceFlow(accessToken, guildId) {
  const baseUrl = config.apiBaseUrl;
  
  if (!accessToken || !guildId) {
    return null;
  }
  
  // Get voice channel
  const voiceChannel = getVoiceChannel(accessToken, guildId);
  
  if (!voiceChannel) {
    return null; // Skip if no voice channel
  }
  
  const channelId = voiceChannel.id;
  
  // Request voice token
  const tokenPayload = JSON.stringify({
    channelId: channelId,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Load-Test': 'true'  // Bypass rate limiting for load tests
    },
  };
  
  const tokenRes = http.post(`${baseUrl}/api/voice/token`, tokenPayload, params);
  
  check(tokenRes, {
    'get voice token status is 200': (r) => r.status === 200,
    'voice token has token': (r) => r.json('token') !== undefined,
    'voice token has url': (r) => r.json('url') !== undefined,
  });
  
  return {
    channelId,
    token: tokenRes.json('token'),
  };
}
