#!/usr/bin/env node

async function testFrontendUserCreation() {
    try {
        console.log('🔐 Logging in through frontend...');
        
        // Step 1: Login through frontend to get auth cookie
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
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
            console.error('❌ Frontend login failed:', loginResponse.status);
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Frontend login successful');
        
        // Get auth cookie from response
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        const authTokenMatch = setCookieHeader?.match(/auth-token=([^;]+)/);
        const authToken = authTokenMatch ? authTokenMatch[1] : null;
        
        if (!authToken) {
            console.error('❌ No auth token found in response');
            return;
        }

        // Step 2: Delete any existing user first
        console.log('🗑️ Checking if user exists and deleting...');
        try {
            const deleteResponse = await fetch('http://localhost:3001/api/admin/users?id=96', {
                method: 'DELETE',
                headers: {
                    'Cookie': `auth-token=${authToken}`
                }
            });
            if (deleteResponse.ok) {
                console.log('✅ Existing user deleted');
            }
        } catch (e) {
            console.log('ℹ️ No existing user to delete');
        }

        // Step 3: Create user through frontend API
        console.log('👤 Creating user through frontend API...');
        const createResponse = await fetch('http://localhost:3001/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth-token=${authToken}`
            },
            body: JSON.stringify({
                name: 'Kenan User',
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!',
                role: 'AGENT',
                status: 'ACTIVE'
            })
        });

        console.log('Frontend create response status:', createResponse.status);
        const createData = await createResponse.json();
        console.log('Frontend create response:', createData);

        if (createResponse.ok && createData.success) {
            console.log('✅ User created through frontend!');
            
            // Step 4: Test login through frontend
            console.log('🔐 Testing login through frontend...');
            const testLoginResponse = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'Kennen_02@icloud.com',
                    password: 'Kenzo3477!'
                })
            });

            console.log('Frontend login test status:', testLoginResponse.status);
            const testLoginData = await testLoginResponse.json();
            
            if (testLoginData.success) {
                console.log('🎉 SUCCESS! Kenan can now log in through the frontend!');
                console.log('📧 Email:', testLoginData.user.email);
                console.log('👤 Name:', testLoginData.user.name);
                console.log('🔑 Role:', testLoginData.user.role);
            } else {
                console.log('❌ Frontend login still failed:', testLoginData);
            }
        } else {
            console.log('❌ Frontend user creation failed:', createData.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFrontendUserCreation();