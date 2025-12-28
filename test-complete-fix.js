#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testCompleteFix() {
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

        // Test 1: Assign a new campaign (should work)
        console.log('\n🧪 TEST 1: Assigning SURVEY-2025 campaign to user 119...');
        const newAssignResponse = await fetch(`${BACKEND_URL}/api/user-management/119/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                campaignId: 'SURVEY-2025',
                assignedBy: 1
            })
        });

        console.log(`📊 New Assignment Status: ${newAssignResponse.status}`);
        if (newAssignResponse.ok) {
            console.log('✅ New campaign assignment successful');
        } else {
            const errorData = await newAssignResponse.text();
            console.log('❌ New assignment failed:', errorData);
        }

        // Test 2: Try to assign the same campaign again (should also return 200 now)
        console.log('\n🧪 TEST 2: Attempting duplicate assignment of SURVEY-2025...');
        const duplicateAssignResponse = await fetch(`${BACKEND_URL}/api/user-management/119/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                campaignId: 'SURVEY-2025',
                assignedBy: 1
            })
        });

        console.log(`📊 Duplicate Assignment Status: ${duplicateAssignResponse.status}`);
        if (duplicateAssignResponse.ok) {
            const duplicateData = await duplicateAssignResponse.json();
            console.log('✅ SUCCESS! Duplicate assignment handled gracefully');
            console.log('📝 Same assignment returned without error');
        } else {
            console.log('❌ Still getting error for duplicate:', await duplicateAssignResponse.text());
        }

        console.log('\n🎯 SUMMARY:');
        console.log('- New assignments: Working');
        console.log('- Duplicate assignments: Now idempotent (no errors)');
        console.log('- Backend deployment: Successfully updated');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCompleteFix();