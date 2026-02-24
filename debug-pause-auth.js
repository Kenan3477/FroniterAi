// Debug script to check pause events authentication
const FRONTEND_URL = 'https://omnivox-ai.vercel.app';

async function debugPauseAuth() {
    console.log('🔍 Debugging Pause Events Authentication...\n');

    try {
        // Test different authentication approaches
        const testRequests = [
            {
                name: 'Pause Events with no auth',
                url: `${FRONTEND_URL}/api/pause-events?startDate=2026-02-17&endDate=2026-02-24`,
                headers: {}
            },
            {
                name: 'Pause Events Stats with no auth',
                url: `${FRONTEND_URL}/api/pause-events/stats?startDate=2026-02-17&endDate=2026-02-24`,
                headers: {}
            },
            {
                name: 'Reports Generate with no auth',
                url: `${FRONTEND_URL}/api/admin/reports/generate?type=pause_reasons&dateFrom=2026-02-17&dateTo=2026-02-24`,
                headers: {}
            }
        ];

        for (const test of testRequests) {
            console.log(`\n🧪 Testing: ${test.name}`);
            console.log(`📋 URL: ${test.url}`);
            
            try {
                const response = await fetch(test.url, {
                    method: 'GET',
                    headers: test.headers
                });
                
                console.log(`📊 Status: ${response.status} ${response.statusText}`);
                
                const responseText = await response.text();
                let responseData;
                
                try {
                    responseData = JSON.parse(responseText);
                    console.log(`📋 Response: ${JSON.stringify(responseData, null, 2)}`);
                } catch {
                    console.log(`📋 Raw Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
                }
                
            } catch (fetchError) {
                console.log(`❌ Fetch Error: ${fetchError.message}`);
            }
            
            console.log('─'.repeat(50));
        }

        // Test with various token types
        const tokenTests = [
            {
                name: 'Pause Events with temp local token',
                url: `${FRONTEND_URL}/api/pause-events`,
                headers: {
                    'Authorization': 'Bearer temp_local_token_123456789',
                    'Cookie': 'auth-token=temp_local_token_123456789'
                }
            }
        ];

        console.log('\n🔑 Testing with Authentication Tokens...\n');
        
        for (const test of tokenTests) {
            console.log(`🧪 Testing: ${test.name}`);
            console.log(`📋 URL: ${test.url}`);
            
            try {
                const response = await fetch(test.url, {
                    method: 'GET',
                    headers: test.headers
                });
                
                console.log(`📊 Status: ${response.status} ${response.statusText}`);
                
                const responseText = await response.text();
                let responseData;
                
                try {
                    responseData = JSON.parse(responseText);
                    console.log(`📋 Response: ${JSON.stringify(responseData, null, 2)}`);
                } catch {
                    console.log(`📋 Raw Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
                }
                
            } catch (fetchError) {
                console.log(`❌ Fetch Error: ${fetchError.message}`);
            }
            
            console.log('─'.repeat(50));
        }

    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

// Run the debug
debugPauseAuth().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});