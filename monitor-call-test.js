/**
 * Real-time Call Monitoring Script
 * Monitors backend API health and call flow during testing
 */

const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';
const CHECK_INTERVAL = 2000; // Check every 2 seconds
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

let lastCallCount = null;
let lastActiveCall = null;

function log(color, emoji, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.gray}[${timestamp}]${colors.reset} ${emoji} ${color}${message}${colors.reset}`);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${path}`;
    const startTime = Date.now();
    
    https.get(url, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, duration });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, duration, error: e.message });
        }
      });
    }).on('error', (err) => {
      const duration = Date.now() - startTime;
      reject({ error: err.message, duration });
    });
  });
}

async function checkBackendHealth() {
  try {
    const result = await makeRequest('/api/dialler/agents');
    
    if (result.status === 200) {
      log(colors.green, '✅', `Backend healthy (${result.duration}ms)`);
      return true;
    } else {
      log(colors.red, '❌', `Backend error: ${result.status} (${result.duration}ms)`);
      return false;
    }
  } catch (error) {
    log(colors.red, '❌', `Backend unreachable: ${error.error} (${error.duration}ms)`);
    return false;
  }
}

async function monitorActiveCalls() {
  try {
    const result = await makeRequest('/api/stuck-calls/status');
    
    if (result.status === 200) {
      const { activeCalls, stuckCalls } = result.data;
      
      // Check if call count changed
      if (lastCallCount !== null && activeCalls.length !== lastCallCount) {
        if (activeCalls.length > lastCallCount) {
          log(colors.cyan, '📞', `NEW CALL STARTED! Active calls: ${lastCallCount} → ${activeCalls.length}`);
          
          // Show the new call details
          const newCall = activeCalls[activeCalls.length - 1];
          if (newCall) {
            log(colors.blue, '🔍', `  Call ID: ${newCall.callId}`);
            log(colors.blue, '🔍', `  Agent: ${newCall.agentId}`);
            log(colors.blue, '🔍', `  Customer: ${newCall.phoneNumber}`);
            log(colors.blue, '🔍', `  Started: ${new Date(newCall.startTime).toLocaleTimeString()}`);
          }
        } else {
          log(colors.yellow, '📴', `CALL ENDED! Active calls: ${lastCallCount} → ${activeCalls.length}`);
          
          // Show which call ended
          if (lastActiveCall && activeCalls.length === 0) {
            log(colors.yellow, '🔍', `  Ended call: ${lastActiveCall.callId}`);
            log(colors.yellow, '🔍', `  Duration: ${Math.floor((Date.now() - new Date(lastActiveCall.startTime).getTime()) / 1000)}s`);
          }
        }
      }
      
      lastCallCount = activeCalls.length;
      if (activeCalls.length > 0) {
        lastActiveCall = activeCalls[0];
      }
      
      // Alert on stuck calls
      if (stuckCalls.length > 0) {
        log(colors.red, '⚠️', `STUCK CALLS DETECTED: ${stuckCalls.length} calls stuck!`);
        stuckCalls.forEach(call => {
          const ageMinutes = Math.floor((Date.now() - new Date(call.startTime).getTime()) / 60000);
          log(colors.red, '  ⚠️', `Call ${call.callId} stuck for ${ageMinutes} minutes`);
        });
      }
      
    } else {
      log(colors.red, '❌', `Monitoring endpoint error: ${result.status}`);
    }
  } catch (error) {
    log(colors.red, '❌', `Monitoring failed: ${error.error}`);
  }
}

async function monitorLoop() {
  console.clear();
  log(colors.cyan, '🚀', '========================================');
  log(colors.cyan, '🚀', 'OMNIVOX CALL MONITORING STARTED');
  log(colors.cyan, '🚀', '========================================');
  log(colors.gray, 'ℹ️', `Monitoring backend: ${BACKEND_URL}`);
  log(colors.gray, 'ℹ️', `Check interval: ${CHECK_INTERVAL}ms`);
  log(colors.gray, 'ℹ️', `Press Ctrl+C to stop`);
  log(colors.cyan, '🚀', '========================================\n');
  
  // Initial health check
  const healthy = await checkBackendHealth();
  if (!healthy) {
    log(colors.red, '⚠️', 'Backend is not healthy! Check Railway logs.');
  }
  
  // Start monitoring loop
  setInterval(async () => {
    await monitorActiveCalls();
  }, CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n');
  log(colors.yellow, '👋', 'Monitoring stopped');
  process.exit(0);
});

// Start monitoring
monitorLoop().catch(error => {
  log(colors.red, '❌', `Fatal error: ${error.message}`);
  process.exit(1);
});
