// Messaging Flow Scenario
// Tests: List Messages → Send Message → Edit Message

import http from 'k6/http';
import { check } from 'k6';
import { config } from '../utils/config.js';
import { getDefaultChannel } from '../utils/helpers.js';

export function messageFlow(accessToken, guildId) {
  const baseUrl = config.apiBaseUrl;
  
  if (!accessToken || !guildId) {
    return null;
  }
  
  // Get default text channel
  const channel = getDefaultChannel(accessToken, guildId);
  
  if (!channel) {
    return null;
  }
  
  const channelId = channel.id;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Load-Test': 'true'  // Bypass rate limiting for load tests
    },
  };
  
  // List messages (paginated)
  const listRes = http.get(`${baseUrl}/api/channels/${channelId}/messages?page=1&pageSize=50`, params);
  
  check(listRes, {
    'list messages status is 200': (r) => r.status === 200,
    'list messages has items': (r) => Array.isArray(r.json('items')),
  });
  
  // Send a message
  const messagePayload = JSON.stringify({
    content: `Load test message ${__VU}_${__ITER}_${Date.now()}`,
  });
  
  const sendRes = http.post(`${baseUrl}/api/channels/${channelId}/messages`, messagePayload, params);
  
  const sendSuccess = check(sendRes, {
    'send message status is 201': (r) => r.status === 201,
    'send message has id': (r) => r.json('id') !== undefined,
    'send message has content': (r) => r.json('content') !== undefined,
  });
  
  if (!sendSuccess) {
    return null;
  }
  
  const messageId = sendRes.json('id');
  
  // Edit the message
  const editPayload = JSON.stringify({
    content: `Edited: Load test message ${__VU}_${__ITER}_${Date.now()}`,
  });
  
  const editRes = http.put(`${baseUrl}/api/channels/${channelId}/messages/${messageId}`, editPayload, params);
  
  check(editRes, {
    'edit message status is 200': (r) => r.status === 200,
    'edit message has updated content': (r) => r.json('content') !== undefined,
  });
  
  return {
    channelId,
    messageId,
  };
}
