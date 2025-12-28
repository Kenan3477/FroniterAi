#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function getCampaigns() {
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

        // Get campaigns
        const campaignsResponse = await fetch(`${BACKEND_URL}/api/campaigns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            console.log('✅ Available campaigns:');
            campaignsData.data.forEach(campaign => {
                console.log(`🎯 ${campaign.campaignId}: ${campaign.name}`);
            });
        } else {
            const errorData = await campaignsResponse.json();
            console.log('❌ Failed to get campaigns:', errorData.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

getCampaigns();