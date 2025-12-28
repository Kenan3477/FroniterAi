#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testEmailFixComplete() {
    try {
        console.log('🔧 Testing complete email case fix...');
        
        // Step 1: Login as admin
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

        // Step 2: Clean up any existing test users
        console.log('\n🗑️ Cleaning up test users...');
        const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const testUsers = Array.isArray(users) ? users.filter(u => 
                u.email.includes('TEST_EMAIL_FIX') || u.name.includes('Email Fix Test')
            ) : [];
            
            for (const user of testUsers) {
                console.log(`🗑️ Deleting existing test user: ${user.email}`);
                await fetch(`${BACKEND_URL}/api/admin/users/${user.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
            }
        }

        // Step 3: Create test user with MIXED CASE email
        console.log('\n👤 Creating test user with MIXED CASE email...');
        const testEmail = 'TEST_EMAIL_FIX@Example.Com'; // Mixed case intentionally
        const testPassword = 'TestPassword123!';
        
        const createResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Email Fix Test User',
                email: testEmail,
                password: testPassword,
                role: 'AGENT'
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ User creation failed:', errorText);
            return;
        }

        const createData = await createResponse.json();
        console.log('✅ User created with mixed case email:', testEmail);
        console.log('📧 Stored email should be lowercase:', createData.data.email);

        // Step 4: Wait a moment for consistency
        console.log('\n⏳ Waiting for database consistency...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 5: Test login with ORIGINAL MIXED CASE email
        console.log('\n🔐 Testing login with ORIGINAL mixed case email...');
        const originalCaseLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail, // Original mixed case
                password: testPassword
            })
        });

        if (originalCaseLogin.ok) {
            console.log('✅ ORIGINAL mixed case email login: SUCCESS');
        } else {
            const errorData = await originalCaseLogin.json();
            console.log('❌ ORIGINAL mixed case email login: FAILED -', errorData.message);
        }

        // Step 6: Test login with LOWERCASE email
        console.log('\n🔐 Testing login with lowercase email...');
        const lowercaseLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail.toLowerCase(), // Force lowercase
                password: testPassword
            })
        });

        if (lowercaseLogin.ok) {
            console.log('✅ Lowercase email login: SUCCESS');
        } else {
            const errorData = await lowercaseLogin.json();
            console.log('❌ Lowercase email login: FAILED -', errorData.message);
        }

        // Step 7: Test login with USERNAME
        console.log('\n🔐 Testing login with username...');
        const username = testEmail.split('@')[0]; // Should be "TEST_EMAIL_FIX"
        
        const usernameLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: testPassword
            })
        });

        if (usernameLogin.ok) {
            console.log('✅ Username login: SUCCESS');
        } else {
            const errorData = await usernameLogin.json();
            console.log('❌ Username login: FAILED -', errorData.message);
        }

        // Step 8: Verify stored email format
        console.log('\n🔍 Verifying how email was stored...');
        const updatedUsersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (updatedUsersResponse.ok) {
            const updatedUsers = await updatedUsersResponse.json();
            const createdUser = Array.isArray(updatedUsers) ? 
                updatedUsers.find(u => u.name === 'Email Fix Test User') : null;
            
            if (createdUser) {
                console.log('📧 Email in database:', createdUser.email);
                console.log('📧 Original email input:', testEmail);
                console.log('📧 Lowercase conversion:', testEmail.toLowerCase());
                console.log('✅ Email storage check:', createdUser.email === testEmail.toLowerCase() ? 'CORRECT (lowercase)' : 'INCORRECT (mixed case)');
            }
        }

        // Final summary
        console.log('\n📋 EMAIL FIX TEST SUMMARY:');
        console.log('✅ User creation with mixed case email completed');
        console.log('🔍 Login tests performed with various formats');
        console.log('📧 Email storage format verified');
        console.log('\n🎯 If all login methods work, the email case fix is complete!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Wait for Railway deployment and run test
console.log('⏳ Waiting for Railway deployment...');
setTimeout(testEmailFixComplete, 45000); // Wait 45 seconds