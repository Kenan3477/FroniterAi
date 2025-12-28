#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testBackendUserCreation() {
    try {
        console.log('🔐 Logging in to Railway backend as admin...');
        
        // Step 1: Login as admin to get token
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        if (!loginResponse.ok) {
            console.error('❌ Admin login failed:', loginResponse.status);
            const errorText = await loginResponse.text();
            console.error('Error response:', errorText);
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Admin login successful');
        console.log('Admin user:', loginData.data.user.email, 'Role:', loginData.data.user.role);
        
        const authToken = loginData.data.token;
        if (!authToken) {
            console.error('❌ No auth token in response');
            return;
        }

        // Step 2: Try to create the user directly on Railway backend
        console.log('🔧 Creating user on Railway backend...');
        const createUserResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Kenan User',  // Backend expects single name field
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!',
                role: 'AGENT'
            })
        });

        console.log('Create user response status:', createUserResponse.status);
        
        if (!createUserResponse.ok) {
            const errorText = await createUserResponse.text();
            console.error('❌ Backend error response:', errorText);
            return;
        }

        const createResult = await createUserResponse.json();
        console.log('✅ User created successfully:', createResult);

        // Step 3: Test login with the new user
        console.log('🔐 Testing login with new user on Railway backend...');
        const testLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!'
            })
        });

        console.log('Test login response status:', testLoginResponse.status);
        
        if (testLoginResponse.ok) {
            const testLoginData = await testLoginResponse.json();
            console.log('✅ New user login successful!');
            console.log('   User:', testLoginData.data.user.email);
            console.log('   Role:', testLoginData.data.user.role);
        } else {
            const errorText = await testLoginResponse.text();
            console.log('❌ New user login failed:', errorText);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testBackendUserCreation();