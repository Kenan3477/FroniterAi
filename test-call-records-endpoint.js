const fetch = require('node-fetch');

async function testCallRecordsAPI() {
    try {
        console.log('🔍 Testing call records API endpoint...\n');

        // Test the API endpoint that the frontend is calling
        const response = await fetch('https://froniterai-production.up.railway.app/api/call-records?page=1&limit=25', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Using a dummy token since we just want to see what data structure is returned
                'Authorization': 'Bearer dummy-token'
            }
        });

        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        const responseText = await response.text();
        console.log('Response Text:', responseText);
        
        if (responseText) {
            try {
                const data = JSON.parse(responseText);
                console.log('\nParsed Response:', JSON.stringify(data, null, 2));
                
                if (data.callRecords && Array.isArray(data.callRecords)) {
                    console.log(`\n📊 API returned ${data.callRecords.length} call records`);
                    
                    if (data.callRecords.length > 0) {
                        console.log('\nFirst record structure:');
                        console.log(JSON.stringify(data.callRecords[0], null, 2));
                    }
                }
            } catch (parseError) {
                console.log('Failed to parse as JSON:', parseError.message);
            }
        }
        
    } catch (error) {
        console.error('API Test Error:', error.message);
    }
}

testCallRecordsAPI();