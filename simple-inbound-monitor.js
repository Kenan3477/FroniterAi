#!/usr/bin/env node

/**
 * Simple Inbound Call Monitor
 * 
 * Monitors just the webhook endpoint and backend health for inbound call testing
 */

const axios = require('axios');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m'
};

const log = (level, category, message, data = null) => {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const color = {
    'success': colors.green,
    'error': colors.red,
    'warning': colors.yellow,
    'info': colors.blue
  }[level] || colors.white;
  
  let status = {
    'success': '🟢',
    'error': '❌', 
    'warning': '🟡',
    'info': 'ℹ️'
  }[level] || '📋';
  
  console.log(`[${timestamp}] ${status} ${category.toUpperCase()} ${message}`);
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Test webhook endpoint accessibility
async function testWebhook() {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/calls/webhook/inbound-call`, {}, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    log('success', 'webhook', 'Webhook endpoint accessible');
    return true;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.data === 'Invalid signature') {
      log('success', 'webhook', 'Webhook endpoint accessible (signature validation active)');
      return true;
    }
    log('error', 'webhook', 'Webhook endpoint failed', { error: error.message });
    return false;
  }
}

// Test backend health
async function testBackendHealth() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    log('success', 'backend', 'Railway backend healthy', response.data);
    return true;
  } catch (error) {
    log('error', 'backend', 'Backend health check failed', { error: error.message });
    return false;
  }
}

// Main monitoring function
async function monitor() {
  log('info', 'system', '📋 SIMPLE INBOUND CALL MONITOR');
  log('info', 'system', `Monitoring: ${BACKEND_URL}`);
  log('info', 'system', 'Twilio Number: +442046343130');
  log('info', 'system', 'Press Ctrl+C to stop monitoring');
  console.log();
  
  // Initial tests
  const healthOk = await testBackendHealth();
  const webhookOk = await testWebhook();
  
  if (healthOk && webhookOk) {
    log('success', 'system', '✅ SYSTEM READY - Ready for inbound call testing!');
    log('info', 'instructions', 'TESTING STEPS:');
    console.log('   1. Open frontend: http://localhost:3000');
    console.log('   2. Login as Kennen_02: kennen_02@icloud.com');
    console.log('   3. Set agent status to "Available"');
    console.log('   4. Call: +442046343130');
    console.log('   5. Watch for webhook events in Railway logs');
  } else {
    log('error', 'system', '❌ SYSTEM NOT READY - Please fix issues above');
  }
  
  // Periodic health checks
  setInterval(async () => {
    await testBackendHealth();
  }, 30000); // Every 30 seconds
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n📴 STOPPING MONITOR');
  process.exit(0);
});

// Start monitoring
monitor();