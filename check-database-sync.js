const fetch = require('node-fetch');

async function checkUserInDatabase() {
    console.log('🔍 CHECKING IF FRONTEND-CREATED USERS REACH RAILWAY DATABASE\n');
    
    try {
        // Step 1: Login to get admin token
        console.log('🔑 Step 1: Getting admin authentication...');
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
            console.error('❌ Failed to login to backend:', loginResult);
            return;
        }

        const authToken = loginResult.data.token;
        console.log('✅ Got backend auth token\n');

        // Step 2: Create a unique test user through frontend
        console.log('👤 Step 2: Creating test user through FRONTEND...');
        const timestamp = Date.now();
        const testUser = {
            name: 'Database Check Test User',
            email: `db-check-test-${timestamp}@example.com`,
            password: 'DbCheck123!',
            role: 'AGENT',
            status: 'ACTIVE',
            department: '',
            phoneNumber: ''
        };

        const frontendCreateResponse = await fetch('http://localhost:3000/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'auth-token=' + authToken // Using the same token for simplicity
            },
            body: JSON.stringify(testUser)
        });

        const frontendResult = await frontendCreateResponse.json();
        console.log('Frontend create result:', frontendResult);

        if (!frontendResult.success) {
            console.error('❌ Frontend user creation failed');
            return;
        }

        const createdUserId = frontendResult.data?.id;
        console.log(`✅ Frontend says user created with ID: ${createdUserId}\n`);

        // Step 3: Check if user exists in Railway backend database
        console.log('🔍 Step 3: Checking if user exists in Railway database...');
        const backendUsersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const backendUsersResult = await backendUsersResponse.json();
        
        if (!backendUsersResult.success) {
            console.error('❌ Failed to get users from backend:', backendUsersResult);
            return;
        }

        // Look for our test user
        const users = backendUsersResult.data || backendUsersResult.users || [];
        const testUserInDb = users.find(u => u.email === testUser.email);

        if (testUserInDb) {
            console.log('✅ SUCCESS: User found in Railway database!');
            console.log('User in database:', {
                id: testUserInDb.id,
                email: testUserInDb.email,
                name: testUserInDb.name,
                role: testUserInDb.role
            });
            
            // Step 4: Test direct login to Railway backend
            console.log('\n🔐 Step 4: Testing direct login to Railway backend...');
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
                console.log('✅ Direct login to Railway backend WORKS!');
                console.log('🎯 Issue is in FRONTEND login routing, not user creation');
            } else {
                console.log('❌ Direct login to Railway backend FAILS!');
                console.log('Error:', directLoginResult);
                console.log('🎯 Issue is in password storage/hashing');
            }
            
        } else {
            console.log('❌ CRITICAL ISSUE: User NOT found in Railway database!');
            console.log('🚨 Frontend is creating users somewhere else (local DB?)');
            console.log('Available users in Railway DB:');
            users.slice(0, 5).forEach(u => {
                console.log(`  - ${u.email} (${u.name})`);
            });
        }

    } catch (error) {
        console.error('❌ Error during database check:', error);
    }
}

checkUserInDatabase();