#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testFixedBackend() {
    try {
        console.log('🔧 Testing fixed backend with debugging...');
        
        // Step 1: Login as admin to get token
        console.log('🔐 Logging in as admin...');
        const adminLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        if (!adminLogin.ok) {
            console.error('❌ Admin login failed - backend might not be ready yet');
            return;
        }

        const adminData = await adminLogin.json();
        const authToken = adminData.data.token;
        console.log('✅ Admin login successful');

        // Step 2: Delete any existing test user
        console.log('\n🗑️ Cleaning up any existing test users...');
        try {
            // Get all users to find Kenan's user ID
            const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (usersResponse.ok) {
                const users = await usersResponse.json();
                const existingUser = Array.isArray(users) ? users.find(u => u.email.includes('Kennen_02')) : null;
                
                if (existingUser) {
                    console.log(`🗑️ Found existing user ID ${existingUser.id}, deleting...`);
                    await fetch(`${BACKEND_URL}/api/admin/users/${existingUser.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                    console.log('✅ Existing user deleted');
                }
            }
        } catch (e) {
            console.log('ℹ️ No existing user to delete');
        }

        // Step 3: Create Kenan's user with debugging enabled
        console.log('\n👤 Creating Kenan\'s user with fixed backend...');
        const createResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Kenan User',
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!',
                role: 'AGENT'
            })
        });

        console.log('Create response status:', createResponse.status);
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ User creation failed:', errorText);
            return;
        }

        const createData = await createResponse.json();
        console.log('✅ User created:', createData.message);
        console.log('📧 Email:', createData.data.email);
        console.log('🆔 User ID:', createData.data.id);
        console.log('👤 Name:', createData.data.name);

        // Step 4: Test login with email (the problematic case)
        console.log('\n🔐 Testing login with EMAIL...');
        const emailLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!'
            })
        });

        console.log('Email login response status:', emailLoginResponse.status);
        
        if (emailLoginResponse.ok) {
            const emailLoginData = await emailLoginResponse.json();
            console.log('🎉 SUCCESS! Email login works!');
            console.log('👤 User:', emailLoginData.data.user.name);
            console.log('🔑 Role:', emailLoginData.data.user.role);
        } else {
            const emailError = await emailLoginResponse.json();
            console.log('❌ Email login failed:', emailError.message);
            
            // Step 5: Test login with username as fallback
            console.log('\n🔐 Testing login with USERNAME...');
            const usernameLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'Kennen_02',
                    password: 'Kenzo3477!'
                })
            });

            console.log('Username login response status:', usernameLoginResponse.status);
            
            if (usernameLoginResponse.ok) {
                const usernameLoginData = await usernameLoginResponse.json();
                console.log('✅ Username login works!');
                console.log('👤 User:', usernameLoginData.data.user.name);
                console.log('🔑 Role:', usernameLoginData.data.user.role);
                console.log('\n⚠️ Issue: Email login fails but username login works');
            } else {
                const usernameError = await usernameLoginResponse.json();
                console.log('❌ Username login also failed:', usernameError.message);
            }
        }

        // Step 6: Test the debug endpoint if it exists
        console.log('\n🔍 Testing debug endpoint...');
        try {
            const debugResponse = await fetch(`${BACKEND_URL}/api/auth/debug-user/Kennen_02@icloud.com`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (debugResponse.ok) {
                const debugData = await debugResponse.json();
                console.log('🔍 Debug data:', debugData);
            } else {
                console.log('ℹ️ Debug endpoint not available (expected)');
            }
        } catch (e) {
            console.log('ℹ️ Debug endpoint not available');
        }

        // Final summary
        console.log('\n📋 SUMMARY:');
        console.log('✅ Backend is working and accessible');
        console.log('✅ Admin authentication works');
        console.log('✅ User creation works with debug logging');
        console.log('🔍 Login testing completed - check debug logs above');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Wait a moment for Railway to deploy, then run the test
console.log('⏳ Waiting for Railway deployment...');
setTimeout(testFixedBackend, 30000); // Wait 30 seconds