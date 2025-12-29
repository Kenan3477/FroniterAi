#!/usr/bin/env node

/**
 * Test Inbound Call System
 * 
 * This script simulates an incoming Twilio webhook to test the complete
 * inbound call handling system end-to-end.
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3004';

// Test inbound call webhook
async function testInboundWebhook() {
  console.log('🧪 Testing inbound call webhook...');
  
  try {
    const twilioWebhookData = {
      // Twilio webhook parameters for incoming call
      CallSid: `CA${Math.random().toString(36).substr(2, 9)}`,
      CallStatus: 'ringing',
      From: '+1234567890',
      To: '+442046343130', // Our UK number
      Direction: 'inbound',
      CallerName: 'John Test',
      AccountSid: 'AC123456789',
      ApiVersion: '2010-04-01'
    };

    const response = await axios.post(
      `${BACKEND_URL}/api/calls/webhook/inbound-call`,
      twilioWebhookData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TwilioProxy/1.1',
          'X-Twilio-Signature': 'test-signature' // This will be ignored in dev mode
        }
      }
    );

    console.log('✅ Inbound call webhook response:');
    console.log('Status:', response.status);
    console.log('TwiML Response:', response.data);

    return { callSid: twilioWebhookData.CallSid, success: true };

  } catch (error) {
    console.error('❌ Inbound webhook test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false };
  }
}

// Test get active inbound calls
async function testGetActiveCalls() {
  console.log('\n📞 Testing get active inbound calls...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/calls/inbound-active`);
    
    console.log('✅ Active inbound calls:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Get active calls test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Test agent answer call
async function testAgentAnswerCall(callId) {
  console.log(`\n🏃 Testing agent answer call (${callId})...`);
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/calls/inbound-answer`,
      {
        callId: callId,
        agentId: 'agent-001' // Test agent ID
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('✅ Agent answer call response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Agent answer call test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Test call status webhook
async function testCallStatusWebhook(callSid, callId, status = 'completed') {
  console.log(`\n📊 Testing call status webhook (${status})...`);
  
  try {
    const twilioStatusData = {
      CallSid: callSid,
      CallStatus: status,
      From: '+1234567890',
      To: '+442046343130',
      Duration: status === 'completed' ? '45' : null,
      // Add other Twilio status parameters as needed
    };

    const response = await axios.post(
      `${BACKEND_URL}/api/calls/webhook/inbound-status?callId=${callId}`,
      twilioStatusData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TwilioProxy/1.1'
        }
      }
    );

    console.log('✅ Call status webhook response:');
    console.log('Status:', response.status);
    console.log('Response:', response.data || 'OK');

    return true;

  } catch (error) {
    console.error('❌ Call status webhook test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Health check
async function testHealthCheck() {
  console.log('🏥 Testing backend health...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting Omnivox-AI Inbound Call System Tests\n');
  console.log('='.repeat(50));

  // 1. Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Backend not healthy, stopping tests');
    return;
  }

  // 2. Test inbound webhook
  const webhookResult = await testInboundWebhook();
  if (!webhookResult.success) {
    console.log('\n❌ Webhook test failed, stopping tests');
    return;
  }

  // 3. Wait a moment for processing
  console.log('\n⏳ Waiting 2 seconds for call processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Check active calls
  const activeCalls = await testGetActiveCalls();
  let callId = null;
  
  if (activeCalls && activeCalls.data && activeCalls.data.length > 0) {
    callId = activeCalls.data[0].id;
    console.log(`📞 Found active call ID: ${callId}`);
  }

  // 5. Test agent answer (if we have a call)
  if (callId) {
    await testAgentAnswerCall(callId);
    
    // 6. Test call completion webhook
    await testCallStatusWebhook(webhookResult.callSid, callId, 'completed');
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Inbound call system tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('✅ Health check:', healthOk ? 'PASSED' : 'FAILED');
  console.log('✅ Inbound webhook:', webhookResult.success ? 'PASSED' : 'FAILED');
  console.log('✅ Active calls API:', activeCalls ? 'PASSED' : 'FAILED');
  console.log('✅ Agent answer API:', callId ? 'TESTED' : 'SKIPPED');
  console.log('✅ Status webhook:', callId ? 'TESTED' : 'SKIPPED');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Open http://localhost:3001 to access the frontend');
  console.log('2. Login as an agent to see inbound call notifications');
  console.log('3. Call your Twilio number to test real inbound calls');
  console.log('4. Monitor the backend logs for real-time events');
}

// Check if script is run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testInboundWebhook,
  testGetActiveCalls,
  testAgentAnswerCall,
  testCallStatusWebhook,
  testHealthCheck
};