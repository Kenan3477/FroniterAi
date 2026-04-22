// Diagnostic script to analyze landline vs mobile call patterns
const fetch = require('node-fetch');

async function diagnoseLandlineIssues() {
    console.log('🔍 Diagnosing Landline Call Issues...\n');
    
    const backendUrl = 'https://froniterai-production.up.railway.app';
    
    // Test numbers - you can modify these
    const testNumbers = {
        landline: '+441234567890', // UK landline format
        mobile: '+447700900123',   // UK mobile format
        international: '+12125551234' // US number for comparison
    };
    
    console.log('📊 Testing different number types:');
    console.log('   Landline:', testNumbers.landline);
    console.log('   Mobile:', testNumbers.mobile);
    console.log('   International:', testNumbers.international);
    console.log('\n⚠️  Note: These are test numbers - no actual calls will be placed\n');
    
    // Check backend health first
    try {
        console.log('🔍 Checking backend health...');
        const healthResponse = await fetch(`${backendUrl}/health`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Backend is healthy:', healthData.status);
            console.log('   Database connected:', healthData.database?.connected);
            console.log('   Services ready:', Object.keys(healthData.services || {}).join(', '));
        } else {
            console.log('❌ Backend health check failed:', healthResponse.status);
            return;
        }
        
        console.log('\n🔍 Checking Twilio configuration...');
        
        // Test Twilio webhook endpoints
        const webhookTests = [
            '/api/calls/twiml',
            '/api/calls/twiml-customer-to-agent',
            '/api/calls/status'
        ];
        
        for (const endpoint of webhookTests) {
            try {
                const webhookResponse = await fetch(`${backendUrl}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'test=true'
                });
                
                console.log(`   ${endpoint}: ${webhookResponse.status} ${webhookResponse.ok ? '✅' : '❌'}`);
            } catch (webhookError) {
                console.log(`   ${endpoint}: ERROR - ${webhookError.message} ❌`);
            }
        }
        
        console.log('\n📋 Common landline call issues to watch for:');
        console.log('   1. Geographic permissions - Some countries/regions may be restricted');
        console.log('   2. Number format validation - Landlines may have stricter formatting requirements');
        console.log('   3. Carrier routing delays - Landlines often take longer to route than mobiles');
        console.log('   4. Answer timeouts - Landlines may need longer ring times');
        console.log('   5. TwiML response delays - Webhook latency can cause call failures');
        
        console.log('\n🔍 When you make a call, look for these log patterns:');
        console.log('   - "📞 FAST DIAL: Making REST API call" - Initial request');
        console.log('   - "⚡ FAST DIAL SUCCESS: Customer call initiated" - Twilio call started');
        console.log('   - "📊 Background: Starting database operations" - Background processing');
        console.log('   - Twilio webhook calls to /api/calls/twiml-customer-to-agent');
        console.log('   - Status callbacks for call progress (initiated, ringing, answered, completed)');
        
        console.log('\n📞 Ready to monitor! Please make your landline call now...');
        console.log('   Watch for timing differences and error patterns');
        console.log('   Compare with mobile calls to identify landline-specific issues');
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
    }
}

// Also check for common landline-specific Twilio errors
function checkTwilioErrors() {
    console.log('\n🚨 Common Twilio errors for landline calls:');
    console.log('   21215 - Invalid phone number format');
    console.log('   21216 - Number not reachable');  
    console.log('   21217 - Invalid country code');
    console.log('   21218 - Invalid number for region');
    console.log('   21408 - Permission denied for geographic area');
    console.log('   21421 - PhoneNumber Unavailable');
    console.log('   30001 - Queue timeout (call not answered)');
    console.log('   30003 - Call timed out');
    console.log('   30004 - Call rejected');
    console.log('   30005 - Call canceled');
    console.log('   31002 - Call failed due to machine detection');
    console.log('   31003 - Call failed');
}

diagnoseLandlineIssues().then(() => {
    checkTwilioErrors();
    console.log('\n⏳ Monitoring ready - make your call and share any errors you see!');
}).catch(console.error);