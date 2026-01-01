const fetch = require('node-fetch');

async function testVoiceEndpoint() {
    console.log('🎤 Testing frontend voice endpoint...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQURNSU4iLCJlbWFpbCI6ImFkbWluQG9tbml2b3gtYWkuY29tIiwiaWF0IjoxNzY3MTg1NTYwLCJleHAiOjE3NjcyMTQzNjB9._nyrSjznxzVH5qyCaONlmUFnUnmvW98evHie2tdjHFs';
    
    try {
        const response = await fetch('http://localhost:3000/api/voice/inbound-numbers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', response.status);
        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testVoiceEndpoint();