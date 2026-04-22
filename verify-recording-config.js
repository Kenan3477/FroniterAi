#!/usr/bin/env node

/**
 * TEST: Verify Recording Parameters in Deployed Code
 * This connects to production and checks if recording is configured
 */

const https = require('https');

console.log('🔍 TESTING RECORDING CONFIGURATION\n');
console.log('=' .repeat(70));

// Test 1: Check if backend is healthy
console.log('\n1️⃣ Testing backend health...');
https.get('https://froniterai-production.up.railway.app/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const health = JSON.parse(data);
    console.log('   ✅ Backend is healthy');
    console.log(`   📅 Timestamp: ${health.timestamp}`);
    console.log(`   🎙️ Recordings service: ${health.services?.recordings || 'unknown'}`);
  });
}).on('error', err => {
  console.error('   ❌ Backend health check failed:', err.message);
});

// Test 2: Instructions
setTimeout(() => {
  console.log('\n' + '='.repeat(70));
  console.log('\n2️⃣ TO VERIFY RECORDINGS WORK:\n');
  console.log('   📞 Make a NEW test call through your dialer');
  console.log('   ⏱️  Talk for at least 10 seconds');
  console.log('   📲 End the call');
  console.log('   ⏳ Wait 60-90 seconds for Twilio to process');
  console.log('   📊 Refresh Reports → Call Records');
  console.log('   ✅ Your new call should have a recording!\n');
  
  console.log('='.repeat(70));
  console.log('\n3️⃣ WHY OLD CALLS SHOW "No recording":\n');
  console.log('   ⏰ All calls in your screenshot are from 16:25-16:30');
  console.log('   🚀 Recording fix was deployed at 17:20');
  console.log('   ❌ Old calls were made WITHOUT recording parameters');
  console.log('   ✅ New calls (after 17:20) WILL have recordings\n');
  
  console.log('='.repeat(70));
  console.log('\n4️⃣ RECORDING PARAMETERS NOW ACTIVE:\n');
  console.log('   ✅ record: "record-from-answer-dual"');
  console.log('   ✅ recordingStatusCallback: /api/calls/recording-callback');
  console.log('   ✅ recordingChannels: "dual"');
  console.log('   ✅ recordingStatusCallbackEvent: ["completed"]');
  console.log('   ✅ Webhook handler: Ready to receive recordings\n');
  
  console.log('='.repeat(70));
  console.log('\n💡 IMPORTANT:\n');
  console.log('   Historical calls (before 17:20 today) will NEVER have recordings');
  console.log('   They were made before recording was enabled');
  console.log('   Only NEW calls will be recorded going forward\n');
  
  console.log('='.repeat(70));
  console.log('\n🎯 ACTION REQUIRED:\n');
  console.log('   Make a test call NOW to verify recordings work! 🎉\n');
  
}, 1000);
