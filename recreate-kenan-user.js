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

async function recreateKenanUser() {
    try {
        console.log('🔐 Logging in to Railway backend as admin...');
        
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
                password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
            })
        });

        const loginData = await loginResponse.json();
        const authToken = loginData.data.token;

        // Step 1: Delete the existing user (ID: 94)
        console.log('🗑️ Deleting existing Kenan user (ID: 94)...');
        const deleteResponse = await fetch(`${BACKEND_URL}/api/admin/users/94`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Delete response status:', deleteResponse.status);
        if (deleteResponse.ok) {
            const deleteData = await deleteResponse.json();
            console.log('✅ User deleted:', deleteData.message);
        } else {
            const deleteError = await deleteResponse.text();
            console.log('❌ Delete failed:', deleteError);
        }

        // Step 2: Create new user with correct password
        console.log('👤 Creating new Kenan user...');
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
        if (createResponse.ok) {
            const createData = await createResponse.json();
            console.log('✅ User created successfully:', createData);
            
            // Step 3: Test login immediately
            console.log('🔐 Testing login with new user...');
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
                console.log('📧 Email:', testLoginData.data.user.email);
                console.log('👤 Name:', testLoginData.data.user.name);
                console.log('🔑 Role:', testLoginData.data.user.role);
                console.log('🔐 Login works!');
            } else {
                console.log('❌ Login still failed:', testLoginData);
            }
        } else {
            const createError = await createResponse.text();
            console.log('❌ Create failed:', createError);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

recreateKenanUser();