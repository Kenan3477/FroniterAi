#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function resetKenanPassword() {
    try {
        console.log('🔐 Logging in to Railway backend as admin...');
        
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

        const loginData = await loginResponse.json();
        const authToken = loginData.data.token;

        // Reset password for Kenan's user (ID: 94)
        console.log('🔄 Resetting password for Kenan (ID: 94)...');
        const resetResponse = await fetch(`${BACKEND_URL}/api/admin/users/94`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Kenan User',
                email: 'Kennen_02@icloud.com',
                password: 'Kenzo3477!',
                role: 'AGENT',
                isActive: true
            })
        });

        console.log('Password reset response status:', resetResponse.status);
        const resetText = await resetResponse.text();
        console.log('Password reset response:', resetText);

        if (resetResponse.ok) {
            console.log('✅ Password reset successful!');
            
            // Test login
            console.log('🔐 Testing login with reset password...');
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
            const testLoginData = await testLoginResponse.json();
            
            if (testLoginData.success) {
                console.log('🎉 SUCCESS! Kenan can now log in!');
                console.log('   User:', testLoginData.data.user.email);
                console.log('   Name:', testLoginData.data.user.name);
                console.log('   Role:', testLoginData.data.user.role);
            } else {
                console.log('❌ Login still failed:', testLoginData);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

resetKenanPassword();