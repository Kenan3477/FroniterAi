#!/usr/bin/env node

/**
 * Check for user conflicts and encoding issues in database
 */

async function checkUserConflicts() {
    console.log('🔍 Checking for user conflicts and encoding issues...');
    
    const emails = [
        'Kennen_02@icloud.com',
        'kennen_02@icloud.com',  // lowercase
        'KENNEN_02@ICLOUD.COM',  // uppercase
        'Kennen_02@icloud.com ', // with space
        ' Kennen_02@icloud.com', // leading space
    ];
    
    // Test API endpoint with different email variations
    const fetch = require('node-fetch');
    
    for (const email of emails) {
        try {
            console.log(`\n--- Testing email: "${email}" ---`);
            
            const response = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: 'Kenzo3477!'
                })
            });
            
            const result = await response.json();
            console.log(`Status: ${response.status}`);
            console.log(`Response:`, result);
            
            // Also test user creation (will fail if user exists, which is informative)
            const createResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'Test User',
                    email: email,
                    password: 'TestPassword123!',
                    role: 'AGENT'
                })
            });
            
            const createResult = await createResponse.text();
            console.log(`Create attempt status: ${createResponse.status}`);
            console.log(`Create response:`, createResult);
            
        } catch (error) {
            console.error(`Error testing ${email}:`, error.message);
        }
    }
    
    // Test if there's a similar username
    console.log('\n=== Testing usernames ===');
    
    const usernames = ['Kennen_02', 'kennen_02', 'Kennen02'];
    
    for (const username of usernames) {
        try {
            const response = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: 'Kenzo3477!'
                })
            });
            
            const result = await response.json();
            console.log(`Username "${username}" - Status: ${response.status}, Response:`, result);
        } catch (error) {
            console.error(`Error testing username ${username}:`, error.message);
        }
    }
}

checkUserConflicts().catch(console.error);