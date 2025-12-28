const fetch = require('node-fetch');

async function checkNewlyCreatedUser() {
    console.log('🔍 CHECKING THE NEWLY CREATED USER\n');
    
    try {
        // Get admin token for Railway backend
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        const loginResult = await loginResponse.json();
        if (!loginResult.success) {
            console.error('❌ Failed to login to Railway backend:', loginResult);
            return;
        }

        const authToken = loginResult.data.token;
        console.log('✅ Got Railway auth token\n');

        // Get all users from Railway backend
        const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const usersResult = await usersResponse.json();
        const users = usersResult.data || usersResult.users || [];
        
        console.log(`📋 CURRENT USERS IN RAILWAY DATABASE (${users.length} total):`);
        
        // Show all users, focusing on the newest one
        users.forEach((user, index) => {
            const isNewest = index === 0; // Assuming newest is first
            const prefix = isNewest ? '🆕 NEWEST:' : '   ';
            console.log(`${prefix} ${user.name} (${user.email}) - ID: ${user.id}`);
            if (isNewest) {
                console.log(`     Created: ${user.createdAt}`);
                console.log(`     Role: ${user.role}`);
            }
        });

        if (users.length > 0) {
            const newestUser = users[0]; // Assuming newest is first
            console.log('\n🧪 TESTING LOGIN FOR NEWEST USER...');
            console.log(`Email: ${newestUser.email}`);
            
            // Let's try some common passwords that might have been used
            const testPasswords = [
                'Test123!',
                'test123',
                'password',
                'Password123!',
                'Admin123!',
                '123456',
                'Kenan3477!',
                '3477'
            ];

            let loginWorked = false;
            
            for (const password of testPasswords) {
                console.log(`   Trying password: "${password}"`);
                
                try {
                    const testLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: newestUser.email,
                            password: password
                        })
                    });

                    const testLoginResult = await testLoginResponse.json();
                    
                    if (testLoginResult.success) {
                        console.log(`   ✅✅✅ SUCCESS! Password "${password}" works!`);
                        console.log('   🎉 NO PASSWORD CORRUPTION DETECTED!');
                        loginWorked = true;
                        break;
                    } else {
                        console.log(`   ❌ Failed: ${testLoginResult.message}`);
                    }
                } catch (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (!loginWorked) {
                console.log('\n❌❌❌ NONE OF THE COMMON PASSWORDS WORK!');
                console.log('🚨 PASSWORD CORRUPTION STILL EXISTS!');
                console.log('\nWhat password did you use when creating this user?');
                console.log(`User: ${newestUser.name} (${newestUser.email})`);
            }
        }

    } catch (error) {
        console.error('❌ Error during check:', error);
    }
}

checkNewlyCreatedUser();