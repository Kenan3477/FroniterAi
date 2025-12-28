const fetch = require('node-fetch');

async function testDirectBackendLogin() {
    console.log('🔐 TESTING DIRECT RAILWAY BACKEND LOGIN\n');
    
    // Test the users we know exist in Railway database
    const testUsers = [
        {
            email: 'Skye@Gmail.co.uk',
            password: 'test123',  // What password did you use?
            name: 'Skye'
        },
        {
            email: 'db-check-test-1766860184683@example.com',
            password: 'DbCheck123!',
            name: 'DB Check Test User'
        }
    ];

    for (const user of testUsers) {
        console.log(`🔐 Testing direct Railway login for: ${user.name}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Password: ${user.password}`);
        
        try {
            const response = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    password: user.password
                })
            });

            console.log(`    Status: ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                console.log(`    ✅ DIRECT RAILWAY LOGIN SUCCESS!`);
                console.log(`    User: ${result.data.user.name}`);
            } else {
                console.log(`    ❌ Direct Railway login failed: ${result.message}`);
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('🎯 ANALYSIS:');
    console.log('- Users ARE created in Railway database ✅');
    console.log('- If direct Railway login fails, password corruption during creation ❌');
    console.log('- If direct Railway login works, frontend login routing issue ❌');
}

testDirectBackendLogin();