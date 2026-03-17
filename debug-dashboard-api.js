const axios = require('axios');

async function debugDashboardAPI() {
    try {
        console.log('🔍 Debugging dashboard API response...\n');

        // Test the dashboard stats API directly
        const frontendAPI = 'https://omnivox-ai.vercel.app/api/dashboard/stats';
        
        console.log('📊 Testing dashboard stats API...');
        console.log('URL:', frontendAPI);

        // Try with different auth methods
        const testMethods = [
            { name: 'No Auth', headers: {} },
            { name: 'Bearer Token', headers: { 'Authorization': 'Bearer test-token' } },
            { name: 'Session Cookie', headers: { 'Cookie': 'session=test' } }
        ];

        for (const method of testMethods) {
            console.log(`\n--- Testing ${method.name} ---`);
            
            try {
                const response = await axios.get(frontendAPI, {
                    headers: method.headers,
                    timeout: 10000
                });

                console.log(`Status: ${response.status}`);
                console.log('Headers:', Object.keys(response.headers));
                
                if (response.data) {
                    console.log('Response data structure:', Object.keys(response.data));
                    
                    if (response.data.success) {
                        console.log('✅ Success response');
                        if (response.data.data && response.data.data.today) {
                            console.log('Today stats:', response.data.data.today);
                        } else {
                            console.log('Data structure:', JSON.stringify(response.data, null, 2));
                        }
                    } else {
                        console.log('❌ Error response:', response.data);
                    }
                } else {
                    console.log('No response data');
                }

            } catch (error) {
                if (error.response) {
                    console.log(`❌ HTTP ${error.response.status}: ${error.response.statusText}`);
                    if (error.response.data) {
                        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
                    }
                } else {
                    console.log(`❌ Network error: ${error.message}`);
                }
            }
        }

        // Also test the simple stats endpoint
        console.log('\n📈 Testing simple stats API...');
        const simpleStatsAPI = 'https://omnivox-ai.vercel.app/api/dashboard/simple-stats';
        
        try {
            const response = await axios.get(simpleStatsAPI);
            console.log(`Status: ${response.status}`);
            console.log('Simple stats response:');
            console.log(JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('Simple stats error:', error.response?.status, error.response?.data || error.message);
        }

    } catch (error) {
        console.error('Debug error:', error.message);
    }
}

debugDashboardAPI();