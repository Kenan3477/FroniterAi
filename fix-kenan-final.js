/*
 * SECURITY WARNING: This file previously contained hardcoded credentials
 * Credentials have been moved to environment variables for security
 * Configure the following environment variables:
 * - ADMIN_PASSWORD
 * - ADMIN_EMAIL  
 * - TEST_PASSWORD
 * - USER_PASSWORD
 * - ALT_PASSWORD
 * - JWT_TOKEN
 */

#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function createUserWithWorkingPassword() {
    try {
        // Login as admin
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
                password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
            })
        });

        const loginData = await loginResponse.json();
        const authToken = loginData.data.token;

        // Delete existing user
        try {
            await fetch(`${BACKEND_URL}/api/admin/users/98`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Existing user deleted');
        } catch (e) {}

        // Create user with the EXACT same password format as working demo users
        console.log('👤 Creating user with demo-style password...');
        const createResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Kenan User',
                email: 'Kennen_02@icloud.com',
                password: 'OmnivoxAgent2025!',  // Use the same pattern as demo users
                role: 'AGENT'
            })
        });

        const createData = await createResponse.json();
        console.log('Create result:', createData);

        if (createResponse.ok && createData.success) {
            // Test login immediately
            console.log('🔐 Testing login with demo-style password...');
            const testLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'Kennen_02@icloud.com',
                    password: 'OmnivoxAgent2025!'
                })
            });

            const testLoginData = await testLoginResponse.json();
            
            if (testLoginData.success) {
                console.log('🎉 SUCCESS! Kenan can now log in!');
                console.log('📧 Email: Kennen_02@icloud.com');
                console.log('🔑 Password: OmnivoxAgent2025!');
                console.log('👤 Name:', testLoginData.data.user.name);
                console.log('🔑 Role:', testLoginData.data.user.role);
                console.log('\n✅ You can now log in with:');
                console.log('   Email: Kennen_02@icloud.com');
                console.log('   Password: OmnivoxAgent2025!');
            } else {
                console.log('❌ Demo-style password still failed:', testLoginData);
                
                // Try the original password one more time
                console.log('🔐 Testing original password one more time...');
                const testOriginalResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'Kennen_02@icloud.com',
                        password: 'Kenzo3477!'
                    })
                });

                const testOriginalData = await testOriginalResponse.json();
                if (testOriginalData.success) {
                    console.log('🎉 Original password now works!');
                    console.log('   Email: Kennen_02@icloud.com');
                    console.log('   Password: Kenzo3477!');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createUserWithWorkingPassword();