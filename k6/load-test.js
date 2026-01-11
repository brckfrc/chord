// K6 Load Test - Main Entry Point
// Orchestrates all critical endpoint scenarios

import { authFlow } from './scenarios/auth-flow.js';
import { guildFlow } from './scenarios/guild-flow.js';
import { messageFlow } from './scenarios/message-flow.js';
import { voiceFlow } from './scenarios/voice-flow.js';
import { config } from './utils/config.js';

export const options = {
  stages: config.stages,
  thresholds: config.thresholds,
};

export function setup() {
  // Log API URL for debugging
  console.log(`[Setup] API Base URL: ${config.apiBaseUrl}`);
  return {};
}

export default function () {
  // 1. Authentication Flow
  const authResult = authFlow();
  
  if (!authResult || !authResult.accessToken) {
    return; // Skip rest if auth fails
  }
  
  const { accessToken } = authResult;
  
  // 2. Guild Flow
  const guildResult = guildFlow(accessToken);
  
  if (!guildResult || !guildResult.guildId) {
    return; // Skip rest if guild creation fails
  }
  
  const { guildId } = guildResult;
  
  // 3. Message Flow
  messageFlow(accessToken, guildId);
  
  // 4. Voice Flow
  voiceFlow(accessToken, guildId);
}
