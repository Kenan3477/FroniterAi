/**
 * Check Railway Backend Status and Debug
 * Checks if the backend is responding and shows any issues
 */

const fetch = require('node-fetch');

async function checkRailwayStatus() {
    console.log('🔍 CHECKING RAILWAY BACKEND STATUS');
    
    try {
        // 1. Check basic backend health
        console.log('\n1. Testing backend health...');
        const healthResponse = await fetch('https://froniterai-production.up.railway.app/api/health');
        console.log(`Health check status: ${healthResponse.status}`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.text();
            console.log(`Health response: ${healthData}`);
        }
        
        // 2. Test a simple endpoint to see if deployment is active
        console.log('\n2. Testing simple endpoint...');
        const simpleResponse = await fetch('https://froniterai-production.up.railway.app/api/calls/token/test-agent');
        console.log(`Token endpoint status: ${simpleResponse.status}`);
        
        // 3. Test save-call-data with minimal data to trigger logs
        console.log('\n3. Testing save-call-data with minimal data...');
        const testResponse = await fetch('https://froniterai-production.up.railway.app/api/calls/save-call-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: '12345',
                callSid: 'CA_debug_test',
                recordingUrl: 'test',
                dispositionId: 'cmm3dgmwi0002bk8br3qsinpd'
            })
        });
        
        console.log(`Save-call-data status: ${testResponse.status}`);
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('Save-call-data response:', JSON.stringify(testData, null, 2));
        } else {
            const errorText = await testResponse.text();
            console.log('Save-call-data error:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Railway check failed:', error.message);
    }
}

checkRailwayStatus();