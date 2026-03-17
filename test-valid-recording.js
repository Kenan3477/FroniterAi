const fetch = require('node-fetch');

async function testValidRecordingStream() {
    try {
        console.log('🔍 Testing recording streaming with valid recording ID...\n');

        // Use a valid recording ID from our database
        const validRecordingId = 'cmm6tpyqh00034na9km3h8viy'; // From the output above
        
        console.log(`Testing recording ID: ${validRecordingId}`);
        
        // Test the streaming endpoint without auth first to see the error
        const streamResponse = await fetch(`https://froniterai-production.up.railway.app/api/recordings/${validRecordingId}/stream`);
        console.log('Stream endpoint status (no auth):', streamResponse.status);
        
        const responseText = await streamResponse.text();
        console.log('Response:', responseText);
        
        if (streamResponse.status === 401) {
            console.log('✅ Endpoint found but requires authentication (this is correct!)');
        }
        
    } catch (error) {
        console.error('Test Error:', error.message);
    }
}

testValidRecordingStream();