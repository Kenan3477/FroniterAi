const fetch = require('node-fetch');

async function testFrontendProxy() {
    console.log('🧪 TESTING FRONTEND PROXY ROUTE\n');
    
    // We need to login through the frontend to get a valid session cookie
    console.log('🔑 Step 1: Login through frontend...');
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

    // Extract cookies from the response
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
    const authCookie = setCookieHeaders.find(cookie => cookie.startsWith('auth-token='));
    
    console.log('Login status:', loginResponse.status);
    console.log('Auth cookie found:', !!authCookie);
    
    if (!authCookie) {
        console.error('❌ Failed to get auth cookie');
        const loginResult = await loginResponse.json();
        console.log('Login result:', loginResult);
        return;
    }

    console.log('✅ Got auth cookie\n');

    // Step 2: Test user creation through frontend proxy
    console.log('👤 Step 2: Creating user through frontend proxy...');
    const testUser = {
        name: 'Frontend Proxy Test',
        email: 'frontend-proxy-test@example.com',
        password: 'Kenan3477!',
        role: 'AGENT',
        status: 'ACTIVE',
        department: '',
        phoneNumber: ''
    };

    console.log('User data to send:');
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

    const createResult = await createResponse.json();
    console.log('Create response status:', createResponse.status);
    console.log('Create result:', createResult);

    if (createResult.success) {
        console.log('✅ User created through frontend proxy!');
        
        // Step 3: Test login with the created user
        console.log('\n🔐 Step 3: Testing login with proxy-created user...');
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

        const testLoginResult = await testLoginResponse.json();
        console.log('Test login result:', testLoginResult);
        
        if (testLoginResult.success) {
            console.log('✅ PROXY-CREATED USER CAN LOGIN!');
            console.log('🤔 This suggests the issue might not be in the proxy...');
        } else {
            console.log('❌ PROXY-CREATED USER CANNOT LOGIN!');
            console.log('🎯 Found the issue - frontend proxy corrupts passwords!');
        }
        
    } else {
        console.log('❌ Failed to create user through frontend proxy');
    }
}

testFrontendProxy().catch(console.error);