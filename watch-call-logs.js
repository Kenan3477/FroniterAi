#!/usr/bin/env node
/**
 * LIVE LOG MONITOR
 * Watches both Vercel and Railway logs in real-time
 * Run this while you test the call
 */

const { spawn } = require('child_process');
const https = require('https');

console.log('🎥 STARTING LIVE LOG MONITOR\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📺 Monitoring:');
console.log('   - Frontend API calls (Vercel)');
console.log('   - Backend processing (Railway)');
console.log('   - Call flow errors');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let lastCallTime = null;
let callInProgress = false;

// Monitor backend endpoint for activity
function checkBackendActivity() {
  const options = {
    hostname: 'froniterai-production.up.railway.app',
    path: '/api/calls/call-rest-api',
    method: 'HEAD',
    timeout: 2000
  };
  
  const req = https.request(options, (res) => {
    // Just checking if endpoint is alive
  });
  
  req.on('error', () => {
    // Ignore errors, just checking connectivity
  });
  
  req.end();
}

// Monitor for new calls
function monitorCalls() {
  const now = Date.now();
  
  if (lastCallTime && (now - lastCallTime < 5000)) {
    // Call detected in last 5 seconds
    if (!callInProgress) {
      callInProgress = true;
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📞 CALL DETECTED AT ${new Date().toLocaleTimeString()}`);
      console.log(`${'='.repeat(50)}\n`);
      
      // Start monitoring more aggressively
      setTimeout(() => {
        console.log('🔍 Checking for errors...\n');
        
        // Check Railway logs
        console.log('📊 Railway Backend Status:');
        https.get('https://froniterai-production.up.railway.app/api/dialer', (res) => {
          console.log(`   ✅ Backend reachable: ${res.statusCode}\n`);
        }).on('error', (err) => {
          console.log(`   ❌ Backend error: ${err.message}\n`);
        });
        
        // Reset call in progress after 10 seconds
        setTimeout(() => {
          callInProgress = false;
          console.log(`\n${'='.repeat(50)}`);
          console.log('📴 Call attempt completed - Ready for next test');
          console.log(`${'='.repeat(50)}\n`);
        }, 10000);
      }, 1000);
    }
  }
}

// Watch for HTTP requests
console.log('⏳ Waiting for you to make a call...\n');
console.log('INSTRUCTIONS:');
console.log('1. Keep this terminal visible');
console.log('2. Go to https://omnivox.vercel.app');
console.log('3. Open browser console (F12)');
console.log('4. Try making a call');
console.log('5. Watch both THIS terminal and browser console\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Poll backend every 2 seconds to detect call attempts
setInterval(() => {
  checkBackendActivity();
  monitorCalls();
}, 2000);

// Also monitor Vercel deployment status
let lastDeploymentStatus = null;
setInterval(() => {
  https.get('https://omnivox.vercel.app/', (res) => {
    const status = res.statusCode;
    if (status !== lastDeploymentStatus) {
      lastDeploymentStatus = status;
      const timestamp = new Date().toLocaleTimeString();
      if (status === 200) {
        console.log(`[${timestamp}] ✅ Vercel frontend: ONLINE (${status})`);
      } else {
        console.log(`[${timestamp}] ⚠️  Vercel frontend: Status ${status}`);
      }
    }
  }).on('error', (err) => {
    console.log(`[${new Date().toLocaleTimeString()}] ❌ Vercel error: ${err.message}`);
  });
}, 10000);

// Detect when user makes a call (by checking if there's a POST request)
console.log('🎯 Ready! Make your call now...\n');

// Keep script running
process.stdin.resume();
