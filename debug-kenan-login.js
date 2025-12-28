#!/usr/bin/env node

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function debugKenanLogin() {
    try {
        console.log('🔍 Debugging Kenan login issue...');
        
        // First, let's try different password variations
        const passwords = [
            'Kenzo3477!',     // Original
            'kenzo3477!',     // lowercase
            'KENZO3477!',     // uppercase  
            'Kenzo3477',      // without !
            'kenzo3477',      // all lowercase no !
        ];
        
        for (const password of passwords) {
            console.log(`\n🔐 Testing password: "${password}"`);
            const testResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'Kennen_02@icloud.com',
                    password: password
                })
            });

            const testData = await testResponse.json();
            if (testData.success) {
                console.log(`✅ SUCCESS with password: "${password}"`);
                console.log('User:', testData.data.user.email);
                return;
            } else {
                console.log(`❌ Failed with: "${password}"`);
            }
        }
        
        // Also test different email variations
        const emails = [
            'Kennen_02@icloud.com',     // Original
            'kennen_02@icloud.com',     // lowercase
            'KENNEN_02@ICLOUD.COM',     // uppercase
        ];
        
        console.log('\n📧 Testing different email formats...');
        for (const email of emails) {
            console.log(`\n📧 Testing email: "${email}"`);
            const testResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: 'Kenzo3477!'
                })
            });

            const testData = await testResponse.json();
            if (testData.success) {
                console.log(`✅ SUCCESS with email: "${email}"`);
                console.log('User:', testData.data.user.email);
                return;
            } else {
                console.log(`❌ Failed with: "${email}"`);
            }
        }
        
        console.log('\n❌ None of the variations worked');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugKenanLogin();