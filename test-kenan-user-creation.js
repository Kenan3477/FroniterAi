#!/usr/bin/env node

const BASE_URL = 'http://localhost:3001';

async function testUserCreation() {
    try {
        console.log('🔐 Logging in as admin...');
        
        // Step 1: Login as admin
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
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
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Admin login successful');
        
        // Extract auth token from Set-Cookie header
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        const authTokenMatch = setCookieHeader?.match(/auth-token=([^;]+)/);
        const authToken = authTokenMatch ? authTokenMatch[1] : null;
        
        if (!authToken) {
            console.error('❌ No auth token found in response');
            return;
        }
        
        console.log('🍪 Got auth token, creating user...');

        // Step 2: Create the user
        const createUserResponse = await fetch(`${BASE_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth-token=${authToken}`
            },
            body: JSON.stringify({
                firstName: 'Kenan',
                lastName: 'User',
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!',
                role: 'AGENT',
                isActive: true
            })
        });

        console.log('Create user response status:', createUserResponse.status);
        const createResult = await createUserResponse.json();
        console.log('Create user result:', createResult);

        if (createResult.success) {
            console.log('✅ User created successfully!');
            
            // Step 3: Test login with new user
            console.log('🔐 Testing login with new user...');
            const testLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
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
            const testLoginData = await testLoginResponse.json();
            
            if (testLoginData.success) {
                console.log('✅ New user login successful!');
                console.log('   User:', testLoginData.user.email);
                console.log('   Role:', testLoginData.user.role);
            } else {
                console.log('❌ New user login failed:', testLoginData);
            }
        } else {
            console.log('❌ User creation failed:', createResult.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testUserCreation();