const axios = require('axios');

// Try both possible Railway URLs that appeared in the codebase
const URLS_TO_TRY = [
    'https://froniterai-production.up.railway.app',
    'https://frontierai-production.up.railway.app' // notice the missing 'i'
];

async function findCorrectRailwayURL() {
    console.log('🔍 FINDING CORRECT RAILWAY DEPLOYMENT URL');
    console.log('==========================================');
    
    for (const url of URLS_TO_TRY) {
        console.log(`\n🧪 Testing: ${url}`);
        
        try {
            // Test health endpoint
            const healthResponse = await axios.get(`${url}/health`, {
                timeout: 5000
            });
            console.log(`✅ Health check passed:`, healthResponse.data);
            
            // If health works, this is likely the correct URL
            return url;
            
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`❌ 404 - This URL doesn't exist or isn't deployed`);
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.log(`❌ Connection failed - URL not reachable`);
            } else {
                console.log(`❌ Other error:`, error.message);
            }
        }
    }
    
    console.log('\n🚨 No working Railway URL found!');
    return null;
}

async function testWithoutAuth(baseUrl) {
    console.log(`\n🧪 TESTING DEPLOYMENT STATUS (No Auth): ${baseUrl}`);
    console.log('==================================================');
    
    try {
        // Test if disposition endpoint exists (should get auth error, not 404)
        console.log('\n1. Testing disposition endpoint exists...');
        
        const dispositionResponse = await axios.post(`${baseUrl}/api/dispositions`, {
            callId: 'test-123',
            outcome: 'test'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Disposition endpoint exists! (Got expected auth error)');
        } else if (error.response?.status === 404) {
            console.log('❌ Disposition endpoint not found - deployment incomplete');
        } else {
            console.log('⚠️  Disposition endpoint error:', error.response?.status, error.response?.data);
        }
    }
    
    // Test diagnostic endpoint
    try {
        console.log('\n2. Testing diagnostic endpoint...');
        
        const diagResponse = await axios.post(`${baseUrl}/api/dialer/test-call-endpoint`, {
            test: 'deployment-check'
        });
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Diagnostic endpoint exists! (Got expected auth error)');
        } else if (error.response?.status === 404) {
            console.log('❌ Diagnostic endpoint not found - new endpoint not deployed yet');
        } else {
            console.log('⚠️  Diagnostic endpoint error:', error.response?.status, error.response?.data);
        }
    }
}

async function main() {
    const workingUrl = await findCorrectRailwayURL();
    
    if (workingUrl) {
        await testWithoutAuth(workingUrl);
    }
}

main();