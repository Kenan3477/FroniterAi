const axios = require('axios');

async function testContactPrioritization() {
    try {
        console.log('🧪 Testing contact prioritization fix...\n');

        const API_BASE = 'https://froniterai-production.up.railway.app';

        // Simulate a call to Kenan's number to test contact linking
        const testCallData = {
            phoneNumber: '+447487723751',  // This should match Kenan Davies, not Unknown Contact
            customerInfo: {
                firstName: 'Test',
                lastName: 'Caller'
            },
            disposition: 'Test Call',
            callDuration: 10,
            agentId: '509',
            callSid: 'CAtest-prioritization-' + Date.now(),
            recordingUrl: null
        };

        console.log('📞 Simulating call save with phone number:', testCallData.phoneNumber);
        console.log('Expected outcome: Should link to Kenan Davies, not Unknown Contact');

        const response = await axios.post(`${API_BASE}/api/calls/save-call-data`, testCallData);

        if (response.status === 200) {
            console.log('✅ Call save successful');
            console.log('Response:', response.data);
            
            if (response.data.message) {
                console.log('Message:', response.data.message);
            }
        } else {
            console.log('❌ Call save failed:', response.status);
        }

        // Wait a moment then check what contact was linked
        console.log('\n⏳ Waiting 2 seconds for database update...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Note: We can't directly query the database from here since we're not authenticated
        // The user will need to check the dashboard or we can create another verification script

        console.log('✅ Test call submitted. Check the dashboard or call records to see if it linked to Kenan Davies.');
        console.log('💡 If the fix worked, this call should appear under Kenan Davies, not Unknown Contact.');

    } catch (error) {
        console.error('Error testing contact prioritization:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }
}

testContactPrioritization();