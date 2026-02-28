const fetch = require('node-fetch');

async function testEmergencyWithAuth() {
    try {
        // First, let's try to get a valid token by logging in
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@omnivox.ai',
                password: 'admin123'
            })
        });

        console.log('Login status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Login successful:', loginData.success);
            
            if (loginData.token) {
                console.log('Token received, testing emergency cleanup...');
                
                const cleanupResponse = await fetch('https://froniterai-production.up.railway.app/api/emergency/wipe-call-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${loginData.token}`
                    }
                });

                console.log('Emergency cleanup status:', cleanupResponse.status);
                const cleanupText = await cleanupResponse.text();
                console.log('Emergency cleanup response:', cleanupText);
            }
        } else {
            const loginError = await loginResponse.text();
            console.log('Login failed:', loginError);
        }
        
    } catch (error) {
        console.error('Test Error:', error.message);
    }
}

testEmergencyWithAuth();