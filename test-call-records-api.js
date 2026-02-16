#!/usr/bin/env node

/**
 * Test call records API to see what's happening
 */

async function testCallRecordsAPI() {
    try {
        console.log('🧪 Testing call-records API...\n');

        const response = await fetch('https://omnivox-alfqntcra-kenans-projects-cbb7e50e.vercel.app/api/call-records?limit=10', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log(`📥 Raw response: ${responseText}\n`);

        if (response.ok) {
            try {
                const result = JSON.parse(responseText);
                console.log('✅ API result:', result);
                
                if (result.success) {
                    console.log(`📊 Found ${result.data?.length || 0} call records`);
                    console.log(`📊 Total records: ${result.total}`);
                } else {
                    console.log('⚠️  API returned success=false:', result.error);
                }
            } catch (parseError) {
                console.log('⚠️  Response not JSON:', responseText);
            }
        } else {
            console.log(`❌ Error ${response.status}`);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testCallRecordsAPI();