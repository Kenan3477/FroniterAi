const fetch = require('node-fetch');

// First, let's get a valid auth token and then test backend behavior
async function debugWithFreshToken() {
    console.log('🔍 Getting fresh auth token...\n');
    
    try {
        // Step 1: Login to get valid token
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
        console.log('Login result:', loginResult.success ? '✅ SUCCESS' : '❌ FAILED');
        
        if (!loginResult.success) {
            console.error('Failed to get auth token:', loginResult);
            return;
        }

        const authToken = loginResult.token;
        console.log('🔑 Got auth token\n');

        // Test user data - exactly what frontend would send
        const testUser = {
            name: 'Debug Test User',
            email: 'debug-backend-test@example.com',
            password: 'Kenan3477!', // Same password that's failing
            role: 'AGENT',
            status: 'ACTIVE',
            department: '',
            phoneNumber: ''
        };

        // Step 2: Create user via backend
        console.log('🧪 Creating user via backend API...');
        const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testUser)
        });

        const createResult = await createResponse.json();
        console.log('Create result:', createResult);
        
        if (!createResult.success) {
            console.error('❌ User creation failed');
            return;
        }

        console.log('✅ User created successfully\n');

        // Step 3: Try to login with the created user
        console.log('🧪 Testing login with created user...');
        const testLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });
        
        const testLoginResult = await testLoginResponse.json();
        console.log('Test user login result:', testLoginResult);
        
        if (testLoginResult.success) {
            console.log('✅ Backend-created user can login successfully!');
            console.log('🔍 This confirms the backend works correctly.');
            console.log('🎯 Issue must be in frontend user creation process.');
        } else {
            console.log('❌ Backend-created user CANNOT login!');
            console.log('🔍 There may be a backend issue with password hashing.');
        }

    } catch (error) {
        console.error('❌ Error during debug:', error);
    }
}

debugWithFreshToken();