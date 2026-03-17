// Test script to verify pause events authentication works after fix
const FRONTEND_URL = 'https://omnivox-ai.vercel.app';

async function testPauseAuthFixed() {
    console.log('🔍 Testing Pause Events Authentication After Fix...\n');

    try {
        // Test 1: Check that temp tokens work (should work)
        console.log('🧪 Test 1: Temp token authentication');
        const tempTokenResponse = await fetch(`${FRONTEND_URL}/api/pause-events?startDate=2026-02-17&endDate=2026-02-24`, {
            headers: {
                'Authorization': 'Bearer temp_local_token_12345',
                'Cookie': 'auth-token=temp_local_token_12345'
            }
        });
        
        console.log(`📊 Status: ${tempTokenResponse.status} ${tempTokenResponse.statusText}`);
        if (tempTokenResponse.ok) {
            const data = await tempTokenResponse.json();
            console.log(`✅ SUCCESS: Received ${data.data?.length || 0} pause events`);
        } else {
            const error = await tempTokenResponse.text();
            console.log(`❌ FAILED: ${error}`);
        }
        
        console.log('─'.repeat(50));

        // Test 2: Check that reports endpoint works with temp token
        console.log('🧪 Test 2: Reports endpoint with temp token');
        const reportsResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=pause_reasons&dateFrom=2026-02-17&dateTo=2026-02-24`, {
            headers: {
                'Authorization': 'Bearer temp_local_token_12345',
                'Cookie': 'auth-token=temp_local_token_12345'
            }
        });
        
        console.log(`📊 Status: ${reportsResponse.status} ${reportsResponse.statusText}`);
        if (reportsResponse.ok) {
            const data = await reportsResponse.json();
            console.log(`✅ SUCCESS: Report generated with ${data.data?.summary?.total_pause_events || 0} events`);
        } else {
            const error = await reportsResponse.text();
            console.log(`❌ FAILED: ${error}`);
        }

        console.log('─'.repeat(50));

        // Test 3: Test stats endpoint
        console.log('🧪 Test 3: Stats endpoint with temp token');
        const statsResponse = await fetch(`${FRONTEND_URL}/api/pause-events/stats?startDate=2026-02-17&endDate=2026-02-24`, {
            headers: {
                'Authorization': 'Bearer temp_local_token_12345',
                'Cookie': 'auth-token=temp_local_token_12345'
            }
        });
        
        console.log(`📊 Status: ${statsResponse.status} ${statsResponse.statusText}`);
        if (statsResponse.ok) {
            const data = await statsResponse.json();
            console.log(`✅ SUCCESS: Stats retrieved - ${data.stats?.totalEvents || 0} events`);
        } else {
            const error = await statsResponse.text();
            console.log(`❌ FAILED: ${error}`);
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run the test
testPauseAuthFixed().then(() => {
    console.log('\n✅ Authentication tests completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});