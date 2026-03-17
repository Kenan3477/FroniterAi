const axios = require('axios');

async function testSaveCallDataEndpoint() {
    console.log('🔍 Testing save-call-data endpoint after deployment...\n');
    
    try {
        // Test with minimal data to see what the error is
        const testData = {
            phoneNumber: '07487723751',
            callDuration: 30,
            agentId: 'demo-agent',
            campaignId: 'manual-dial',
            disposition: {
                outcome: 'completed',
                notes: 'Test call'
            }
        };

        console.log('📞 Testing with data:', JSON.stringify(testData, null, 2));

        const response = await axios.post('https://froniterai-production.up.railway.app/api/calls/save-call-data', testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Success! Response:', response.data);

    } catch (error) {
        console.error('❌ Error details:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.response?.data?.message || error.message);
        
        if (error.response?.data?.details) {
            console.error('Details:', error.response.data.details);
        }
    }
}

testSaveCallDataEndpoint();