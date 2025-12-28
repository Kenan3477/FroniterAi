const fetch = require('node-fetch');

async function quickLoginTest() {
    console.log('🔐 Testing frontend login...');
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        console.log('Status:', response.status);
        const result = await response.json();
        console.log('Result:', result);
        
        // Check if we got a cookie
        const cookies = response.headers.get('set-cookie');
        console.log('Set-Cookie:', cookies);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

quickLoginTest();