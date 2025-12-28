#!/usr/bin/env node

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugUserCampaigns() {
    try {
        // Login as admin to get token
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
        
        console.log('🔐 Admin login successful');

        // Check user 119's campaigns via both frontend and backend APIs
        const userId = 119;

        console.log(`\n📡 Testing FRONTEND API: /api/admin/users/${userId}/campaigns`);
        try {
            const frontendResponse = await fetch(`${FRONTEND_URL}/api/admin/users/${userId}/campaigns`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📊 Frontend Response Status: ${frontendResponse.status}`);
            if (frontendResponse.ok) {
                const frontendData = await frontendResponse.json();
                console.log('📄 Frontend Response Data:');
                console.log(JSON.stringify(frontendData, null, 2));
            } else {
                const errorText = await frontendResponse.text();
                console.log('❌ Frontend Error:', errorText);
            }
        } catch (error) {
            console.log('❌ Frontend API failed:', error.message);
        }

        console.log(`\n📡 Testing BACKEND API: /api/user-management/${userId}/campaigns`);
        const backendResponse = await fetch(`${BACKEND_URL}/api/user-management/${userId}/campaigns`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Backend Response Status: ${backendResponse.status}`);
        if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            console.log('📄 Backend Response Data:');
            console.log(JSON.stringify(backendData, null, 2));
        } else {
            const errorText = await backendResponse.text();
            console.log('❌ Backend Error:', errorText);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

debugUserCampaigns();