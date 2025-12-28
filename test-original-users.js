const fetch = require('node-fetch');

async function testOriginalUsers() {
    console.log('🧪 TESTING ORIGINAL PROBLEMATIC USERS\n');
    
    const originalUsers = [
        {
            email: 'Kenan@test.co.uk',
            password: '3477'
        },
        {
            email: 'Kennen_02@icloud.com', 
            password: 'Kenan3477!'
        }
    ];

    for (const user of originalUsers) {
        console.log(`🔐 Testing login for: ${user.email}`);
        console.log(`    Password: ${user.password}`);
        
        try {
            const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });

            console.log(`    Status: ${loginResponse.status}`);
            const result = await loginResponse.json();
            
            if (result.success) {
                console.log(`    ✅ LOGIN SUCCESS for ${user.email}!`);
                console.log(`    User: ${result.user.name} (${result.user.role})`);
            } else {
                console.log(`    ❌ Login failed: ${result.error || result.message}`);
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('📊 Summary:');
    console.log('If both users can now login, the issue was resolved by fixing the frontend auth API.');
    console.log('If they still cannot login, the issue is specific to how they were created originally.');
}

testOriginalUsers();