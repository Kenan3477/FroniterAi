const fetch = require('node-fetch');

async function testEmergencyCleanup() {
    try {
        const response = await fetch('https://frontierai-production.up.railway.app/api/emergency/wipe-call-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dummy-token-for-test'
            }
        });

        console.log('Emergency cleanup endpoint test:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Response:', data);
        } else {
            const errorText = await response.text();
            console.log('Error Response:', errorText);
        }
        
    } catch (error) {
        console.error('Network Error:', error.message);
    }
}

testEmergencyCleanup();