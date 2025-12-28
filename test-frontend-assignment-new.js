#!/usr/bin/env node

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testFrontendAssignment() {
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

        // Test assigning a campaign that user 119 is NOT assigned to
        const userId = 119;
        const campaignId = 'FOLLOW-UP-2025';

        console.log(`🎯 Testing assignment of campaign "${campaignId}" to user ${userId}`);
        console.log(`📡 Frontend API URL: ${FRONTEND_URL}/api/admin/users/${userId}/campaigns`);

        const assignResponse = await fetch(`${FRONTEND_URL}/api/admin/users/${userId}/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                campaignId: campaignId
            })
        });

        console.log(`📊 Frontend Response Status: ${assignResponse.status}`);
        
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            console.log('✅ Frontend assignment successful:', assignData);
        } else {
            const errorText = await assignResponse.text();
            console.log('❌ Frontend assignment failed:');
            console.log('📄 Error response:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.log('🔍 Parsed error:', errorData);
            } catch (e) {
                console.log('⚠️ Could not parse error as JSON');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFrontendAssignment();