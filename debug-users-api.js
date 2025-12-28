#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugUsersAPI() {
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

        // Get users with detailed debugging
        console.log('👥 Fetching users with debug info...');
        const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Users API response status:', usersResponse.status);
        const responseText = await usersResponse.text();
        console.log('Raw response:', responseText);

        if (responseText) {
            try {
                const usersData = JSON.parse(responseText);
                console.log('Parsed response:', JSON.stringify(usersData, null, 2));
            } catch (e) {
                console.log('Failed to parse as JSON');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugUsersAPI();