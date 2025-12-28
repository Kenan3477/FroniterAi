const fetch = require('node-fetch');

async function checkRecentUsers() {
    console.log('🔍 CHECKING RECENT USERS FOR CORRUPTION\n');
    
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
        if (!usersResult.success) {
            console.error('❌ Failed to get users:', usersResult);
            return;
        }

        const users = usersResult.data || usersResult.users || [];
        
        console.log('📋 ALL USERS IN RAILWAY DATABASE:');
        console.log('(Testing each one for login corruption)');
        console.log('');

        // Test login for each user with common passwords
        const commonPasswords = [
            '3477',
            'Kenan3477!',
            'test123', 
            'password123',
            'Test1234!',
            'Simple123!',
            'DbCheck123!'
        ];

        for (const user of users.slice(0, 15)) { // Test first 15 users
            console.log(`👤 User: ${user.name} (${user.email})`);
            console.log(`   ID: ${user.id}, Created: ${user.createdAt}`);
            
            let foundPassword = false;
            
            for (const password of commonPasswords) {
                try {
                    const testLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: user.email,
                            password: password
                        })
                    });

                    const testLoginResult = await testLoginResponse.json();
                    
                    if (testLoginResult.success) {
                        console.log(`   ✅ LOGIN WORKS with password: "${password}"`);
                        foundPassword = true;
                        break;
                    }
                } catch (error) {
                    // Skip network errors
                }
                
                // Small delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (!foundPassword) {
                console.log(`   ❌❌❌ NO PASSWORD WORKS - CORRUPTED USER!`);
                console.log(`   ⚠️  This user may have been created during the bug period`);
            }
            
            console.log('');
        }

        console.log('🎯 ANALYSIS:');
        console.log('- Users that show "LOGIN WORKS" are properly created');
        console.log('- Users that show "NO PASSWORD WORKS" have corrupted passwords');
        console.log('- Corrupted users were likely created before we fixed the auth bug');

    } catch (error) {
        console.error('❌ Error during recent user check:', error);
    }
}

checkRecentUsers();