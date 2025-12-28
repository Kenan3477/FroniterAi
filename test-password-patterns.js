const fetch = require('node-fetch');

async function testPasswordPatterns() {
    console.log('🧪 TESTING PASSWORD PATTERNS FOR CORRUPTION\n');
    
    try {
        // Get auth token first
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        const cookies = loginResponse.headers.get('set-cookie');
        const authCookie = cookies.match(/auth-token=([^;]+)/)?.[0];
        
        if (!authCookie) {
            console.error('❌ Failed to get auth cookie');
            return;
        }

        // Test different password patterns
        const passwordTests = [
            { name: 'Simple', password: 'Test1234', expectedWork: true },
            { name: 'With !', password: 'Test1234!', expectedWork: true },
            { name: 'Complex', password: 'Kenan3477!', expectedWork: true },
            { name: 'Simple Numbers', password: '3477', expectedWork: false }, // Too short
            { name: 'UK Domain', password: 'Test123!', expectedWork: true }
        ];

        for (let i = 0; i < passwordTests.length; i++) {
            const test = passwordTests[i];
            const timestamp = Date.now() + i;
            
            console.log(`🧪 Test ${i + 1}: ${test.name} password`);
            console.log(`    Password: "${test.password}"`);
            
            const testUser = {
                name: `Pattern Test ${i + 1}`,
                email: `pattern-test-${timestamp}@example.com`,
                password: test.password,
                role: 'AGENT',
                status: 'ACTIVE',
                department: '',
                phoneNumber: ''
            };

            // Create user through frontend
            try {
                const createResponse = await fetch('http://localhost:3000/api/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': authCookie
                    },
                    body: JSON.stringify(testUser)
                });

                const createResult = await createResponse.json();
                
                if (createResult.success) {
                    console.log(`    ✅ User created with ID: ${createResult.data.id}`);
                    
                    // Test direct Railway login
                    const directLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: testUser.email,
                            password: testUser.password
                        })
                    });

                    const directLoginResult = await directLoginResponse.json();
                    
                    if (directLoginResult.success) {
                        console.log(`    ✅ Password works - no corruption!`);
                    } else {
                        console.log(`    ❌ Password CORRUPTED during creation!`);
                        console.log(`    Error: ${directLoginResult.message}`);
                    }
                    
                } else {
                    console.log(`    ❌ User creation failed: ${createResult.message}`);
                }
                
            } catch (error) {
                console.log(`    ❌ Error: ${error.message}`);
            }
            
            console.log('');
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
    } catch (error) {
        console.error('❌ Error during password pattern test:', error);
    }
}

testPasswordPatterns();