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

async function checkUserCampaigns() {
    try {
        // Login as admin
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
                password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
            })
        });

        const loginData = await loginResponse.json();
        const token = loginData.data.token;

        console.log('✅ Admin login successful');

        // Check user 119's current campaigns
        const userCampaignsResponse = await fetch(`${BACKEND_URL}/api/user-management/119/campaigns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (userCampaignsResponse.ok) {
            const userCampaignsData = await userCampaignsResponse.json();
            console.log('📋 User 119 current campaigns:');
            console.log(JSON.stringify(userCampaignsData, null, 2));
        } else {
            console.log('❌ Failed to get user campaigns:', userCampaignsResponse.status);
        }

        // Get available campaigns
        const campaignsResponse = await fetch(`${BACKEND_URL}/api/user-management/campaigns/available`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            console.log('🎯 Available campaigns:');
            campaignsData.data.forEach(campaign => {
                console.log(`   - ${campaign.campaignId}: ${campaign.name}`);
            });
        } else {
            console.log('❌ Failed to get campaigns:', campaignsResponse.status);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

checkUserCampaigns();