#!/usr/bin/env node

/**
 * Test the exact database email stored vs login email
 */

async function testEmailCase() {
    console.log('🔍 Testing email case sensitivity issue...');
    
    const fetch = require('node-fetch');
    
    // First, let's get the actual user data by using the working username login
    try {
        const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'Kennen_02',
                password: 'Kenzo3477!'
            })
        });
        
        const loginResult = await loginResponse.json();
        
        if (loginResult.success) {
            console.log('✅ Username login successful!');
            console.log('User data:', {
                id: loginResult.data.user.id,
                username: loginResult.data.user.username,
                email: loginResult.data.user.email,
                name: loginResult.data.user.name
            });
            
            const storedEmail = loginResult.data.user.email;
            console.log(`\n📧 Stored email in database: "${storedEmail}"`);
            console.log(`📧 Email we're trying to login with: "Kennen_02@icloud.com"`);
            console.log(`📧 Are they identical? ${storedEmail === 'Kennen_02@icloud.com'}`);
            console.log(`📧 Lowercase comparison: "${storedEmail.toLowerCase()}" vs "kennen_02@icloud.com"`);
            console.log(`📧 Lowercase match: ${storedEmail.toLowerCase() === 'kennen_02@icloud.com'}`);
            
            // Now test login with the exact stored email
            console.log(`\n🔐 Testing login with exact stored email: "${storedEmail}"`);
            
            const emailLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: storedEmail,
                    password: 'Kenzo3477!'
                })
            });
            
            const emailLoginResult = await emailLoginResponse.json();
            console.log(`Email login result:`, emailLoginResult);
            
            // Test with lowercase version
            console.log(`\n🔐 Testing login with lowercase email: "${storedEmail.toLowerCase()}"`);
            
            const lowerEmailResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: storedEmail.toLowerCase(),
                    password: 'Kenzo3477!'
                })
            });
            
            const lowerEmailResult = await lowerEmailResponse.json();
            console.log(`Lowercase email login result:`, lowerEmailResult);
            
        } else {
            console.error('❌ Username login failed:', loginResult);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testEmailCase().catch(console.error);