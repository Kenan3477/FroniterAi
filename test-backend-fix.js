#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testBackendFix() {
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

        console.log('✅ Admin login successful');

        // Test assigning a campaign that user 119 is already assigned to
        // This should now return 200 instead of 400
        const userId = 119;
        const campaignId = 'campaign_1766695393511'; // We know user 119 has this

        console.log(`🎯 Testing duplicate assignment: campaign "${campaignId}" to user ${userId}`);
        console.log('🔍 This should now return 200 instead of 400...');

        const assignResponse = await fetch(`${BACKEND_URL}/api/user-management/${userId}/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                campaignId: campaignId,
                assignedBy: 1
            })
        });

        console.log(`📊 Backend Response Status: ${assignResponse.status}`);
        
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            console.log('✅ SUCCESS! Backend now handles duplicate assignments gracefully');
            console.log('📄 Response data:', JSON.stringify(assignData, null, 2));
        } else {
            const errorText = await assignResponse.text();
            console.log('❌ Still getting error response:');
            console.log('📄 Error response:', errorText);
            
            if (assignResponse.status === 400) {
                console.log('⚠️ Backend deployment may not be complete yet. Try again in a minute.');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBackendFix();