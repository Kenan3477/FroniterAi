#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testCampaignAssignment() {
    try {
        // 1. Login as admin
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@omnivox-ai.com',
                password: 'OmnivoxAdmin2025!'
            })
        });

        if (!loginResponse.ok) {
            console.error('❌ Admin login failed');
            return;
        }

        const loginData = await loginResponse.json();
        const token = loginData.data.token;
        console.log('✅ Admin login successful');

        // 2. Get available campaigns
        console.log('\n📋 Fetching available campaigns...');
        const campaignsResponse = await fetch(`${BACKEND_URL}/api/user-management/campaigns/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            console.log('✅ Available campaigns:', campaignsData.data.length);
            
            if (campaignsData.data.length > 0) {
                const testCampaign = campaignsData.data[0];
                console.log('🎯 Test campaign details:');
                console.log('   - campaignId:', testCampaign.campaignId);
                console.log('   - name:', testCampaign.name);
                console.log('   - status:', testCampaign.status);

                // 3. Test assignment with actual campaignId
                console.log('\n🔗 Testing campaign assignment...');
                const testUserId = 119; // Kenan's user ID
                
                const assignResponse = await fetch(`${BACKEND_URL}/api/user-management/${testUserId}/campaigns`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        campaignId: testCampaign.campaignId,
                        assignedBy: 1
                    })
                });

                console.log('📡 Assignment response status:', assignResponse.status);

                if (assignResponse.ok) {
                    const assignData = await assignResponse.json();
                    console.log('✅ Campaign assignment successful!');
                    console.log('📦 Response:', assignData.message);
                } else {
                    const errorData = await assignResponse.json();
                    console.log('❌ Campaign assignment failed');
                    console.log('📦 Error:', errorData);
                }
            } else {
                console.log('⚠️ No campaigns available for assignment');
            }
        } else {
            console.log('❌ Failed to fetch available campaigns');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCampaignAssignment();