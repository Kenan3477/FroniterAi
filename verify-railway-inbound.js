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

const fetch = require('node-fetch');

async function verifyRailwayInbound() {
    try {
        console.log('📡 CHECKING RAILWAY INBOUND NUMBERS API');
        console.log('======================================');
        
        // Get auth token via login
        const authResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
                password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
            })
        });
        
        if (!authResponse.ok) {
            throw new Error(`Auth failed: ${authResponse.status}`);
        }
        
        const { accessToken } = await authResponse.json();
        console.log('✅ Got Railway auth token');
        
        // Test the inbound numbers endpoint
        const numbersResponse = await fetch('https://froniterai-production.up.railway.app/api/voice/inbound-numbers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!numbersResponse.ok) {
            throw new Error(`API failed: ${numbersResponse.status} - ${await numbersResponse.text()}`);
        }
        
        const numbers = await numbersResponse.json();
        
        console.log(`\n📊 Railway API returned ${numbers.length} number(s):`);
        numbers.forEach((num, i) => {
            console.log(`   ${i + 1}. ${num.phoneNumber} (${num.type} - ${num.location})`);
        });
        
        console.log('\n✅ RESULT:');
        if (numbers.length === 1 && numbers[0].phoneNumber === '+442046343130') {
            console.log('🎉 SUCCESS: Railway API returns only your Twilio number!');
        } else {
            console.log('❌ ISSUE: Railway API still returning wrong numbers');
            console.log('Expected: Only +442046343130');
            console.log(`Actual: ${numbers.length} numbers returned`);
        }
        
    } catch (error) {
        console.error('❌ Error checking Railway API:', error.message);
    }
}

verifyRailwayInbound();