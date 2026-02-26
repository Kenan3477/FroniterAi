const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';

async function testDispositionSystemOnly() {
    console.log('\n🔍 TESTING DISPOSITION SAVE SYSTEM');
    console.log('==================================');
    
    try {
        // Test with a fake call ID to trigger our enhanced error handling
        console.log('\n📞 Testing disposition save with non-existent call ID...');
        
        const dispositionData = {
            callId: 'fake-call-id-12345',
            outcome: 'completed',
            notes: 'Testing enhanced disposition error handling',
            contactable: true,
            interested: false
        };
        
        const dispositionResponse = await axios.post(`${BASE_URL}/api/dispositions`, dispositionData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.JWT_TOKEN}`
            }
        });
        
        console.log(`✅ Disposition system worked! Created backup record.`);
        console.log(`📋 Response:`, dispositionResponse.data);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('\n🔑 Note: Authentication failed. Check JWT_TOKEN in .env');
        } else if (error.response?.status === 404) {
            console.log('\n🌐 Note: API endpoint not found. Check BASE_URL or API deployment');
        }
    }
    
    console.log('\n🔧 Testing diagnostic endpoint...');
    
    try {
        const testResponse = await axios.post(`${BASE_URL}/api/dialer/test-call-endpoint`, {
            test: 'disposition-fix'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.JWT_TOKEN}`
            }
        });
        
        console.log(`✅ Diagnostic endpoint works:`, testResponse.data);
        
    } catch (error) {
        console.error('\n❌ Diagnostic test failed:', error.response?.data || error.message);
    }
}

// Run the test
testDispositionSystemOnly();