#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testSimplePassword() {
    try {
        console.log('🔐 Creating user with simple password...');
        
        // Login as admin
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

        // Delete existing user first
        try {
            await fetch(`${BACKEND_URL}/api/admin/users/97`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Existing user deleted');
        } catch (e) {}

        // Create user with simple password (no special characters)
        console.log('👤 Creating user with simple password...');
        const createResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Kenan User',
                email: 'Kennen_02@icloud.com',
                password: 'SimplePass123',  // Simple password
                role: 'AGENT'
            })
        });

        const createData = await createResponse.json();
        console.log('Create result:', createData);

        if (createResponse.ok && createData.success) {
            // Test login with simple password
            console.log('🔐 Testing login with simple password...');
            const testLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'Kennen_02@icloud.com',
                    password: 'SimplePass123'
                })
            });

            const testLoginData = await testLoginResponse.json();
            
            if (testLoginData.success) {
                console.log('🎉 SUCCESS with simple password!');
                
                // Now try again with the original password
                console.log('\n🔄 Updating to original password...');
                try {
                    await fetch(`${BACKEND_URL}/api/admin/users/98`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                } catch (e) {}

                const createResponse2 = await fetch(`${BACKEND_URL}/api/admin/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        name: 'Kenan User',
                        email: 'Kennen_02@icloud.com',
                        password: 'Kenzo3477!',  // Original password
                        role: 'AGENT'
                    })
                });

                const createData2 = await createResponse2.json();
                console.log('Second create result:', createData2);

                if (createResponse2.ok) {
                    const testLogin2 = await fetch(`${BACKEND_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: 'Kennen_02@icloud.com',
                            password: 'Kenzo3477!'
                        })
                    });

                    const testLoginData2 = await testLogin2.json();
                    if (testLoginData2.success) {
                        console.log('✅ Original password now works too!');
                        console.log('📧 Email: Kennen_02@icloud.com');
                        console.log('🔑 Password: Kenzo3477!');
                        console.log('👤 Role:', testLoginData2.data.user.role);
                    } else {
                        console.log('❌ Original password still fails');
                    }
                }
            } else {
                console.log('❌ Even simple password failed:', testLoginData);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSimplePassword();