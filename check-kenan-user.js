#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function checkExistingUsers() {
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

        if (!loginResponse.ok) {
            console.error('❌ Admin login failed:', loginResponse.status);
            return;
        }

        const loginData = await loginResponse.json();
        const authToken = loginData.data.token;

        // Get all users to check for Kenan's user
        console.log('👥 Fetching all users...');
        const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!usersResponse.ok) {
            console.error('❌ Failed to fetch users:', usersResponse.status);
            return;
        }

        const usersData = await usersResponse.json();
        const users = usersData.data || usersData.users || [];

        console.log('📋 Found users:');
        users.forEach(user => {
            console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
            
            // Check for Kenan's email specifically
            if (user.email.toLowerCase().includes('kennen_02') || user.email.toLowerCase().includes('icloud')) {
                console.log(`    ⭐ This looks like Kenan's user!`);
                console.log(`    📧 Exact email: ${user.email}`);
                console.log(`    🔑 User ID: ${user.id}`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkExistingUsers();