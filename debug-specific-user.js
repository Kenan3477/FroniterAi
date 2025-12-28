#!/usr/bin/env node

const bcrypt = require('bcryptjs');

async function testPasswordComparison() {
    console.log('🔍 Testing password comparison directly...');
    
    const password = 'Kenzo3477!';
    
    // Test 1: Create a hash and immediately verify
    console.log('\n=== TEST 1: Fresh hash verification ===');
    const freshHash = await bcrypt.hash(password, 12);
    console.log('Fresh hash:', freshHash);
    const freshVerify = await bcrypt.compare(password, freshHash);
    console.log('Fresh verification result:', freshVerify);
    
    // Test 2: Test against specific database user
    console.log('\n=== TEST 2: Database user verification ===');
    
    // Simulate a curl request to get the user data
    const fetch = require('node-fetch');
    
    try {
        // First, let's create a simple test endpoint call
        const response = await fetch('https://froniterai-production.up.railway.app/api/test-user-hash', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'Kennen_02@icloud.com',
                password: password
            })
        });
        
        const result = await response.text();
        console.log('Backend response:', result);
        
    } catch (error) {
        console.log('No test endpoint available, testing locally...');
        
        // Test 3: Test different hash formats
        console.log('\n=== TEST 3: Hash format comparison ===');
        
        // Create different hash examples
        const hash1 = await bcrypt.hash(password, 10);
        const hash2 = await bcrypt.hash(password, 12);
        const hash3 = await bcrypt.hash(password, '$2b$12$'); // Explicit salt
        
        console.log('Hash with 10 rounds:', hash1);
        console.log('Hash with 12 rounds:', hash2);
        console.log('Hash with explicit salt:', hash3);
        
        console.log('Verify 10 rounds:', await bcrypt.compare(password, hash1));
        console.log('Verify 12 rounds:', await bcrypt.compare(password, hash2));
        console.log('Verify explicit:', await bcrypt.compare(password, hash3));
        
        // Test 4: Check for encoding issues
        console.log('\n=== TEST 4: Encoding tests ===');
        
        const passwords = [
            'Kenzo3477!',
            Buffer.from('Kenzo3477!', 'utf8').toString(),
            JSON.parse(JSON.stringify('Kenzo3477!')),
            'Kenzo3477!'.normalize()
        ];
        
        for (let i = 0; i < passwords.length; i++) {
            const testPassword = passwords[i];
            console.log(`Password ${i}:`, JSON.stringify(testPassword));
            console.log(`  Type:`, typeof testPassword);
            console.log(`  Length:`, testPassword.length);
            console.log(`  Codes:`, Array.from(testPassword).map(c => c.charCodeAt(0)));
            
            const testHash = await bcrypt.hash(testPassword, 12);
            const testVerify = await bcrypt.compare(testPassword, testHash);
            console.log(`  Self-verify:`, testVerify);
        }
    }
}

testPasswordComparison().catch(console.error);