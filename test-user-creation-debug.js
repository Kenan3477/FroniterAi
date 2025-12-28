#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testUserCreationWithDebugging() {
    try {
        console.log('🔐 Logging in as admin...');
        
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        const loginData = await loginResponse.json();
        const authToken = loginData.data.token;

        // Delete existing user first
        try {
            await fetch(`${BACKEND_URL}/api/admin/users/99`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Existing user deleted');
        } catch (e) {}

        // Create user with debugging enabled
        console.log('👤 Creating user with debugging...');
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
        const createData = await createResponse.json();
        console.log('Create response data:', createData);

        // Check Railway logs for debugging output
        console.log('\n📋 Check Railway deployment logs for password debugging info');
        console.log('The backend should show password hashing details in the logs');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testUserCreationWithDebugging();