const axios = require('axios');

async function debugBackendKPI() {
    try {
        console.log('🔍 Debugging backend KPI endpoint...\n');

        const backendUrl = 'https://froniterai-production.up.railway.app';
        const endpoint = '/api/kpi/dashboard';
        const fullUrl = backendUrl + endpoint;

        console.log('🎯 Testing backend KPI endpoint:');
        console.log('URL:', fullUrl);

        try {
            const response = await axios.get(fullUrl, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Backend KPI endpoint responded');
            console.log('Status:', response.status);
            console.log('Response data:');
            console.log(JSON.stringify(response.data, null, 2));

        } catch (error) {
            if (error.response) {
                console.log('❌ Backend KPI endpoint failed');
                console.log('Status:', error.response.status);
                console.log('Status Text:', error.response.statusText);
                console.log('Response data:', JSON.stringify(error.response.data, null, 2));
            } else if (error.code === 'ECONNABORTED') {
                console.log('❌ Request timeout');
            } else {
                console.log('❌ Network error:', error.message);
            }
        }

        // Let's also check what endpoints are available
        console.log('\n🔍 Checking if there are alternative stats endpoints...');
        
        const alternativeEndpoints = [
            '/api/dashboard/stats',
            '/api/stats',
            '/api/kpi',
            '/api/analytics',
            '/api/reports/dashboard',
            '/api/call-management/statistics'
        ];

        for (const endpoint of alternativeEndpoints) {
            const testUrl = backendUrl + endpoint;
            console.log(`\n📡 Testing: ${testUrl}`);
            
            try {
                const response = await axios.get(testUrl, {
                    timeout: 5000,
                    headers: { 'Content-Type': 'application/json' }
                });
                
                console.log(`✅ ${endpoint} - Status: ${response.status}`);
                if (response.data && typeof response.data === 'object') {
                    console.log('Response keys:', Object.keys(response.data));
                    if (response.data.data || response.data.success) {
                        console.log('Has data structure');
                    }
                }
            } catch (error) {
                if (error.response) {
                    console.log(`❌ ${endpoint} - Status: ${error.response.status} (${error.response.statusText})`);
                } else {
                    console.log(`❌ ${endpoint} - Error: ${error.message}`);
                }
            }
        }

    } catch (error) {
        console.error('Debug error:', error.message);
    }
}

debugBackendKPI();