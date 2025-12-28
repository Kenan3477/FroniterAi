const fetch = require('node-fetch');

async function testUserCreation() {
    console.log('🧪 TESTING USER CREATION FLOW\n');
    
    try {
        // Step 1: Login and get auth cookie
        console.log('🔐 Step 1: Logging in...');
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

        console.log('✅ Got auth cookie');
        console.log('');

        // Step 2: Create test user
        console.log('👤 Step 2: Creating test user...');
        const testUser = {
            name: 'Creation Flow Test',
            email: 'creation-flow-test@example.com',
            password: 'Kenan3477!', // Same password that fails
            role: 'AGENT',
            status: 'ACTIVE',
            department: '',
            phoneNumber: ''
        };

        console.log('User data:');
        console.log(JSON.stringify(testUser, null, 2));
        console.log('');

        const createResponse = await fetch('http://localhost:3000/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': authCookie
            },
            body: JSON.stringify(testUser)
        });

        console.log('Create response status:', createResponse.status);
        const createResult = await createResponse.json();
        console.log('Create result:', createResult);
        console.log('');

        if (!createResult.success) {
            console.log('❌ User creation failed');
            return;
        }

        console.log('✅ User created successfully!');
        console.log('');

        // Step 3: Test login with created user
        console.log('🔐 Step 3: Testing login with created user...');
        const testLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });

        console.log('Test login status:', testLoginResponse.status);
        const testLoginResult = await testLoginResponse.json();
        console.log('Test login result:', testLoginResult);
        console.log('');

        if (testLoginResult.success) {
            console.log('✅✅✅ FRONTEND-CREATED USER CAN LOGIN SUCCESSFULLY! ✅✅✅');
            console.log('🤔 This means the frontend user creation is working correctly!');
            console.log('🎯 The original issue may have been with the admin portal UI itself.');
        } else {
            console.log('❌❌❌ FRONTEND-CREATED USER CANNOT LOGIN! ❌❌❌');
            console.log('🎯 This confirms there IS an issue with frontend user creation!');
        }

    } catch (error) {
        console.error('❌ Error during test:', error);
    }
}

testUserCreation();