#!/usr/bin/env node

/**
 * Test disposition saving API to see exact error
 */

async function testDispositionSaving() {
    try {
        console.log('🧪 Testing disposition saving API...\n');

        const testData = {
            phoneNumber: '+447700900123',
            customerInfo: {
                firstName: 'Test',
                lastName: 'Customer',
                phone: '+447700900123'
            },
            disposition: {
                outcome: 'COMPLETED',
                notes: 'Test call disposition'
            },
            callDuration: 45,
            agentId: 'test-agent-123',
            campaignId: 'test-campaign'
        };

        console.log('📤 Sending disposition data:', JSON.stringify(testData, null, 2));

        // Test from authenticated browser context (since API requires auth)
        console.log('\n📋 To test this manually:');
        console.log('1. Open browser dev tools');
        console.log('2. Go to your Omnivox app');
        console.log('3. Run this in console:');
        console.log(`
fetch('/api/calls/save-call-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(testData)})
}).then(r => r.json()).then(console.log).catch(console.error)
        `);

        // Also test the external endpoint
        const response = await fetch('https://omnivox-alfqntcra-kenans-projects-cbb7e50e.vercel.app/api/calls/save-call-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log(`\n📥 External API Response status: ${response.status}`);
        
        const responseText = await response.text();
        
        if (response.status === 401) {
            console.log('🔒 Authentication required - as expected');
            console.log('📋 The API needs to be called from within the authenticated app');
        } else {
            console.log('📥 Response:', responseText);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testDispositionSaving();