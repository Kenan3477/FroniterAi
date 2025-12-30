#!/usr/bin/env node

/**
 * Test script to simulate an inbound call to test the direct agent calling implementation
 * This will call the inbound webhook directly to see if the TwiML is generated correctly
 */

const axios = require('axios');

async function testDirectInbound() {
    console.log('Testing direct inbound call implementation...\n');
    
    // Get backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3004';
    
    // Simulate Twilio inbound webhook
    const webhookData = {
        From: '+447911123456',
        To: '+441234567890',
        CallSid: 'CA' + Math.random().toString(36).substr(2, 32),
        AccountSid: 'AC123',
        Direction: 'inbound'
    };
    
    try {
        console.log('📞 Simulating inbound call webhook...');
        console.log('From:', webhookData.From);
        console.log('To:', webhookData.To);
        console.log('CallSid:', webhookData.CallSid, '\n');
        
        const response = await axios.post(
            `${backendUrl}/api/calls/webhook/inbound-call`,
            webhookData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                // Transform object to URL-encoded format
                transformRequest: [(data) => {
                    return Object.keys(data)
                        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                        .join('&');
                }]
            }
        );
        
        console.log('✅ Webhook Response Status:', response.status);
        console.log('📋 TwiML Response:');
        console.log(response.data);
        console.log('\n');
        
        // Check if TwiML contains direct client dialing
        const twimlResponse = response.data;
        if (twimlResponse.includes('<Client>agent-browser</Client>')) {
            console.log('✅ Direct agent dialing detected in TwiML');
        } else if (twimlResponse.includes('<Say>Please hold while we connect you')) {
            console.log('📞 Queue fallback detected - no agents available');
        } else {
            console.log('⚠️  Unexpected TwiML response');
        }
        
    } catch (error) {
        console.error('❌ Error testing inbound call:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
if (require.main === module) {
    testDirectInbound().catch(console.error);
}

module.exports = { testDirectInbound };