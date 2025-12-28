const fetch = require('node-fetch');

async function monitorUserCreationTest() {
    console.log('🔍 MONITORING USER CREATION AND LOGIN TEST\n');
    console.log('This script will check the Railway database before and after you create a user');
    console.log('Then test if the user can actually login with the credentials you used.\n');
    
    try {
        // Get admin token for Railway backend
        console.log('🔑 Getting Railway admin auth...');
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

        // Check initial state
        console.log('📊 INITIAL STATE - Checking Railway database...');
        let initialUsers = await getUsersFromRailway(authToken);
        console.log(`Found ${initialUsers.length} users initially:`);
        initialUsers.forEach(user => {
            console.log(`  - ${user.email} (${user.name})`);
        });
        console.log('');

        console.log('⏳ WAITING FOR YOU TO CREATE A USER...');
        console.log('Go to the frontend admin panel and create a user.');
        console.log('When done, press ENTER to continue...');
        
        // Wait for user input
        await new Promise(resolve => {
            process.stdin.once('data', () => {
                resolve();
            });
        });

        console.log('\n📊 AFTER CREATION - Checking Railway database...');
        let afterUsers = await getUsersFromRailway(authToken);
        console.log(`Found ${afterUsers.length} users after creation:`);
        
        // Find new users
        const newUsers = afterUsers.filter(user => 
            !initialUsers.some(initial => initial.id === user.id)
        );

        if (newUsers.length === 0) {
            console.log('❌ No new users found! User creation may have failed.');
            return;
        }

        console.log(`\n✅ Found ${newUsers.length} new user(s):`);
        for (const user of newUsers) {
            console.log(`\n👤 NEW USER: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Created: ${user.createdAt}`);
            console.log(`   Role: ${user.role}`);

            // Ask for the password they used
            console.log('\n🔐 What password did you use for this user?');
            console.log('Type the password and press ENTER:');
            
            const password = await new Promise(resolve => {
                process.stdin.once('data', (data) => {
                    resolve(data.toString().trim());
                });
            });

            console.log(`\nTesting login with email: "${user.email}" and password: "${password}"`);
            
            // Test direct Railway backend login
            console.log('\n🧪 Testing direct Railway backend login...');
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
                console.log('✅✅✅ DIRECT RAILWAY LOGIN SUCCESS!');
                console.log(`User authenticated as: ${testLoginResult.data.user.name}`);
                console.log('🎉 NO PASSWORD CORRUPTION! System is working!');
            } else {
                console.log('❌❌❌ DIRECT RAILWAY LOGIN FAILED!');
                console.log(`Error: ${testLoginResult.message}`);
                console.log('🚨 PASSWORD CORRUPTION CONFIRMED!');
            }

            // Test frontend login
            console.log('\n🧪 Testing frontend login...');
            const frontendLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    password: password
                })
            });

            const frontendLoginResult = await frontendLoginResponse.json();
            
            if (frontendLoginResult.success) {
                console.log('✅ Frontend login also works!');
            } else {
                console.log('❌ Frontend login failed!');
                console.log(`Error: ${frontendLoginResult.error || frontendLoginResult.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error during monitoring:', error);
    }
}

async function getUsersFromRailway(authToken) {
    try {
        const response = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();
        return result.data || result.users || [];
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

monitorUserCreationTest();