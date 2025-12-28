#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function createTestUser() {
    try {
        // Login as admin
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        const loginData = await loginResponse.json();
        const token = loginData.data.token;

        // Create test user
        const createResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Campaign User',
                email: 'test.campaign@example.com',
                password: 'TestPass123!',
                role: 'AGENT'
            })
        });

        if (createResponse.ok) {
            const createData = await createResponse.json();
            console.log('✅ Test user created:');
            console.log('📧 Email:', createData.data.email);
            console.log('🆔 User ID:', createData.data.id);
            console.log('👤 Name:', createData.data.name);
        } else {
            const errorData = await createResponse.json();
            console.log('❌ Failed to create test user:', errorData.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

createTestUser();