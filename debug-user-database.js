#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugUserDatabase() {
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
        const authToken = loginData.data.token;

        // Get all users and find Kenan's exact details
        console.log('📋 Fetching all users to find Kenan...');
        const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const usersData = await usersResponse.json();
        const users = Array.isArray(usersData) ? usersData : [];

        console.log('\n👥 All users:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}`);
            
            if (user.email.toLowerCase().includes('kennen') || user.email.toLowerCase().includes('icloud')) {
                console.log(`   🎯 KENAN'S USER FOUND!`);
                console.log(`   📧 Exact email: "${user.email}"`);
                console.log(`   🆔 User ID: ${user.id}`);
                console.log(`   📛 Username: "${user.username}"`);
                console.log(`   👤 Name: "${user.name}"`);
                console.log(`   🔑 Role: ${user.role}`);
                console.log(`   ✅ Active: ${user.isActive}`);
                console.log(`   🕐 Created: ${user.createdAt}`);
                console.log(`   🔐 Last login: ${user.lastLogin || 'Never'}`);
            }
        });

        // Test various login attempts
        const testEmails = [
            'Kennen_02@icloud.com',
            'kennen_02@icloud.com',
            'KENNEN_02@ICLOUD.COM'
        ];

        console.log('\n🔐 Testing login with different email cases:');
        for (const email of testEmails) {
            console.log(`\nTesting: ${email}`);
            const testResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: 'Kenzo3477!'
                })
            });

            const testData = await testResponse.json();
            if (testData.success) {
                console.log(`✅ SUCCESS with: ${email}`);
            } else {
                console.log(`❌ Failed with: ${email} - ${testData.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugUserDatabase();