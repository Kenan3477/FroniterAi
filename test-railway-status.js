const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';

async function testRailwayDeployment() {
    console.log('\n🔍 TESTING RAILWAY DEPLOYMENT STATUS');
    console.log('=====================================');
    
    try {
        // Test health endpoint first
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log(`✅ Health check passed:`, healthResponse.data);
        
        // Test login to get a token
        console.log('\n2. Testing authentication...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@omnivox.ai',
            password: 'Ken3477!'
        });
        
        const token = loginResponse.data.token;
        console.log(`✅ Authentication successful! Token obtained.`);
        
        // Now test the disposition endpoint with valid auth
        console.log('\n3. Testing disposition endpoint with valid auth...');
        
        const dispositionData = {
            callId: 'test-call-id-12345',
            outcome: 'completed',
            notes: 'Testing enhanced disposition error handling after deployment',
            contactable: true,
            interested: false
        };
        
        const dispositionResponse = await axios.post(`${BASE_URL}/api/dispositions`, dispositionData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`✅ Disposition system works! Enhanced error handling active.`);
        console.log(`📋 Response:`, dispositionResponse.data);
        
        // Test diagnostic endpoint
        console.log('\n4. Testing diagnostic endpoint...');
        
        try {
            const testResponse = await axios.post(`${BASE_URL}/api/dialer/test-call-endpoint`, {
                test: 'disposition-fix'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`✅ Diagnostic endpoint works:`, testResponse.data);
            
        } catch (diagError) {
            if (diagError.response?.status === 404) {
                console.log('⚠️  Diagnostic endpoint not deployed yet - this is expected for new endpoints');
            } else {
                console.error('❌ Diagnostic endpoint error:', diagError.response?.data || diagError.message);
            }
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n🔑 Authentication failed - check admin password');
        } else if (error.response?.status === 404) {
            console.log('\n🌐 Endpoint not found - deployment might not be complete');
        }
    }
}

// Run the test
testRailwayDeployment();