#!/usr/bin/env node

/**
 * Test save-call-data API to identify exact errors
 */

async function testSaveCallDataAPI() {
    try {
        console.log('🧪 Testing save-call-data API...\n');

        const testData = {
            callId: `TEST-${Date.now()}`,
            phoneNumber: '+447700900123',
            duration: 45,
            disposition: {
                outcome: 'COMPLETED',
                notes: 'Test call disposition'
            },
            agentId: 'test-agent-123',
            campaignId: 'test-campaign',
            customerInfo: {
                firstName: 'Test',
                lastName: 'Customer',
                phone: '+447700900123'
            }
        };

        console.log('📤 Sending test data:', JSON.stringify(testData, null, 2));

        const response = await fetch('https://omnivox-alfqntcra-kenans-projects-cbb7e50e.vercel.app/api/calls/save-call-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log(`📥 Raw response: ${responseText}\n`);

        if (response.ok) {
            try {
                const result = JSON.parse(responseText);
                console.log('✅ Success result:', result);
            } catch (parseError) {
                console.log('⚠️  Response not JSON:', responseText);
            }
        } else {
            console.log(`❌ Error ${response.status}:`);
            try {
                const errorResult = JSON.parse(responseText);
                console.log('Error details:', errorResult);
            } catch (parseError) {
                console.log('Raw error text:', responseText);
            }
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testSaveCallDataAPI();