#!/usr/bin/env node

/**
 * Live Inbound Call Monitor
 * 
 * Real-time monitoring of inbound call flow from Twilio webhook to agent notification
 */

const axios = require('axios');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, prefix, message, data = null) {
  const timestamp = new Date().toISOString().substr(11, 12);
  console.log(`${color}[${timestamp}] ${prefix}${colors.reset} ${message}`);
  if (data) {
    console.log(`${colors.cyan}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
}

// Monitor backend health and status
async function monitorBackendHealth() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    log(colors.green, '🟢 BACKEND', 'Railway backend healthy', {
      status: response.data.status,
      timestamp: response.data.timestamp
    });
    return true;
  } catch (error) {
    log(colors.red, '🔴 BACKEND', 'Railway backend unhealthy', {
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
}

// Check active inbound calls
async function checkActiveInboundCalls() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/calls/inbound/active`);
    const activeCalls = response.data.data || [];
    
    if (activeCalls.length > 0) {
      log(colors.yellow, '📞 CALLS', `Found ${activeCalls.length} active inbound calls`, 
        activeCalls.map(call => ({
          id: call.id,
          caller: call.caller_number,
          status: call.status,
          duration: call.created_at
        }))
      );
    } else {
      log(colors.blue, '📞 CALLS', 'No active inbound calls');
    }
    return activeCalls;
  } catch (error) {
    log(colors.red, '❌ CALLS', 'Error checking active calls', { error: error.message });
    return [];
  }
}

// Test webhook endpoint accessibility
async function testWebhookEndpoint() {
  try {
    // Just test if the endpoint is reachable (will get signature error but that's expected)
    await axios.post(`${BACKEND_URL}/api/calls/webhook/inbound-call`, 
      'CallSid=TEST&From=%2B1234567890&To=%2B442046343130', 
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TwilioProxy/1.1'
        }
      }
    );
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data === 'Invalid signature') {
      log(colors.green, '🟢 WEBHOOK', 'Inbound call webhook endpoint accessible (signature validation active)');
      return true;
    } else if (error.response?.status === 404) {
      log(colors.red, '🔴 WEBHOOK', 'Inbound call webhook endpoint NOT FOUND');
      return false;
    } else {
      log(colors.yellow, '⚠️ WEBHOOK', 'Webhook endpoint accessible with different response', {
        status: error.response?.status,
        data: error.response?.data
      });
      return true;
    }
  }
}

// Monitor for new inbound calls (polling-based since we can't easily tap into real-time events)
let lastCallCount = 0;
let monitoringActive = true;

async function monitorInboundCalls() {
  if (!monitoringActive) return;
  
  try {
    const activeCalls = await checkActiveInboundCalls();
    
    if (activeCalls.length > lastCallCount) {
      log(colors.bright + colors.green, '🚨 NEW CALL', 'NEW INBOUND CALL DETECTED!', {
        newCalls: activeCalls.slice(lastCallCount),
        totalActive: activeCalls.length
      });
      
      // Log detailed information about new calls
      const newCalls = activeCalls.slice(lastCallCount);
      newCalls.forEach(call => {
        log(colors.magenta, '📞 CALL DETAILS', 'Processing new inbound call', {
          callId: call.id,
          callSid: call.call_sid,
          callerNumber: call.caller_number,
          status: call.status,
          contactId: call.contact_id,
          agentId: call.assigned_agent_id,
          createdAt: call.created_at,
          metadata: call.metadata
        });
      });
    }
    
    lastCallCount = activeCalls.length;
  } catch (error) {
    log(colors.red, '❌ MONITOR', 'Error monitoring calls', { error: error.message });
  }
}

// Main monitoring loop
async function startMonitoring() {
  console.log(`${colors.bright}${colors.cyan}🚀 OMNIVOX INBOUND CALL MONITOR STARTED${colors.reset}`);
  console.log(`${colors.white}Monitoring: ${BACKEND_URL}${colors.reset}`);
  console.log(`${colors.white}Twilio Number: +442046343130${colors.reset}`);
  console.log(`${colors.white}Press Ctrl+C to stop monitoring${colors.reset}\n`);

  // Initial system checks
  await monitorBackendHealth();
  await testWebhookEndpoint();
  await checkActiveInboundCalls();

  console.log(`\n${colors.bright}${colors.green}✅ SYSTEM READY - Waiting for inbound calls...${colors.reset}\n`);

  // Start monitoring loop
  const monitorInterval = setInterval(async () => {
    await monitorInboundCalls();
  }, 2000); // Check every 2 seconds

  // Health check every 30 seconds
  const healthInterval = setInterval(async () => {
    await monitorBackendHealth();
  }, 30000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n${colors.bright}${colors.yellow}📴 STOPPING MONITOR${colors.reset}`);
    monitoringActive = false;
    clearInterval(monitorInterval);
    clearInterval(healthInterval);
    process.exit(0);
  });
}

// Instructions for the test
function showTestInstructions() {
  console.log(`${colors.bright}${colors.blue}📋 TESTING INSTRUCTIONS:${colors.reset}`);
  console.log(`${colors.white}1. Keep this monitor running`);
  console.log(`2. Open: http://localhost:3000`);
  console.log(`3. Login as Kennen_02: kennen_02@icloud.com`);
  console.log(`4. Set agent status to "Available"`);
  console.log(`5. Call: +442046343130`);
  console.log(`6. Watch this monitor for real-time processing!${colors.reset}\n`);
}

if (require.main === module) {
  showTestInstructions();
  startMonitoring().catch(console.error);
}

module.exports = { startMonitoring };