#!/usr/bin/env node

/**
 * Test Inbound Call Webhook Processing
 * 
 * Simulates a real Twilio webhook call to debug the inbound call system
 */

require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testInboundWebhook() {
  console.log('🔄 Testing inbound call webhook processing...\n');
  
  // Simulate a real Twilio webhook payload
  const twilioPayload = new URLSearchParams({
    'AccountSid': process.env.TWILIO_ACCOUNT_SID || 'AC_test',
    'From': '+15551234567', // Test caller number
    'To': '+442046343130',   // Our Omnivox number
    'CallSid': 'CA_test_inbound_call_' + Date.now(),
    'CallStatus': 'ringing',
    'Direction': 'inbound',
    'ForwardedFrom': '',
    'CallerName': '',
    'FromCity': 'NEW YORK',
    'FromState': 'NY',
    'FromZip': '10001',
    'FromCountry': 'US',
    'ToCity': 'LONDON',
    'ToState': '',
    'ToZip': '',
    'ToCountry': 'GB',
    'ApiVersion': '2010-04-01'
  }).toString();

  try {
    console.log('📞 Simulating inbound call webhook...');
    console.log('From:', '+15551234567');
    console.log('To:', '+442046343130');
    console.log('Payload size:', twilioPayload.length, 'bytes\n');
    
    const response = await axios.post(
      `${BACKEND_URL}/api/calls/webhook/inbound-call`,
      twilioPayload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TwilioProxy/1.1'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ Webhook Response Status:', response.status);
    console.log('📋 Response Headers:', response.headers['content-type']);
    console.log('📄 Response Body:');
    
    // Try to parse as TwiML
    if (response.headers['content-type']?.includes('xml')) {
      console.log(response.data);
    } else {
      console.log('Type:', typeof response.data);
      console.log('Data:', response.data);
    }
    
    console.log('\n🔍 Now checking if call record was created...');
    
    // Check active calls endpoint
    const activeResponse = await axios.get(`${BACKEND_URL}/api/calls/inbound/active`);
    console.log('📊 Active calls response:', JSON.stringify(activeResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Webhook test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testInboundWebhook();