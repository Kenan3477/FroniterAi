#!/usr/bin/env node

const bcrypt = require('bcryptjs');

async function testDirectDatabaseQuery() {
    console.log('🔍 Testing direct database query...');
    
    // Simulate what the database might have stored
    const password = 'Kenzo3477!';
    
    // Let's try to replicate the exact flow from user creation
    console.log('\n=== REPLICATING USER CREATION FLOW ===');
    
    console.log('Input password:', JSON.stringify(password));
    console.log('Password type:', typeof password);
    console.log('Password length:', password.length);
    console.log('Password char codes:', Array.from(password).map(c => c.charCodeAt(0)));
    
    // Create hash exactly like the backend
    const hash = await bcrypt.hash(password, 12);
    console.log('Generated hash:', hash);
    console.log('Hash length:', hash.length);
    
    // Test verification immediately
    const immediateTest = await bcrypt.compare(password, hash);
    console.log('Immediate verification:', immediateTest);
    
    // Test different password inputs that might come from JSON
    console.log('\n=== TESTING JSON PARSING SCENARIOS ===');
    
    const jsonString = JSON.stringify({password: password});
    const parsedData = JSON.parse(jsonString);
    const extractedPassword = parsedData.password;
    
    console.log('Original password:', JSON.stringify(password));
    console.log('JSON string:', jsonString);
    console.log('Extracted password:', JSON.stringify(extractedPassword));
    console.log('Are they equal?', password === extractedPassword);
    
    const jsonTest = await bcrypt.compare(extractedPassword, hash);
    console.log('JSON extracted password test:', jsonTest);
    
    // Test potential encoding issues
    console.log('\n=== TESTING ENCODING ISSUES ===');
    
    const passwords = [
        password,                          // Original
        password.trim(),                   // Trimmed
        password.normalize(),              // Normalized
        Buffer.from(password, 'utf8').toString(), // Buffer conversion
        JSON.parse(JSON.stringify(password)), // JSON round-trip
    ];
    
    for (let i = 0; i < passwords.length; i++) {
        const testPwd = passwords[i];
        const result = await bcrypt.compare(testPwd, hash);
        console.log(`Test ${i} (${testPwd === password ? 'SAME' : 'DIFF'}):`, result, JSON.stringify(testPwd));
    }
    
    // Test with different salt rounds (in case of mismatch)
    console.log('\n=== TESTING DIFFERENT SALT ROUNDS ===');
    
    for (let rounds of [10, 11, 12, 13]) {
        const testHash = await bcrypt.hash(password, rounds);
        const testResult = await bcrypt.compare(password, testHash);
        console.log(`${rounds} rounds:`, testResult, testHash.substring(0, 20));
    }
    
    // Test the specific scenario where input might be double-encoded
    console.log('\n=== TESTING DOUBLE ENCODING SCENARIOS ===');
    
    const doubleEncoded = JSON.stringify(password);
    const tripleEncoded = JSON.stringify(doubleEncoded);
    
    console.log('Original:', JSON.stringify(password));
    console.log('Double encoded:', doubleEncoded);
    console.log('Triple encoded:', tripleEncoded);
    
    const doubleTest = await bcrypt.compare(doubleEncoded, hash);
    const tripleTest = await bcrypt.compare(tripleEncoded, hash);
    
    console.log('Double encoded test:', doubleTest);
    console.log('Triple encoded test:', tripleTest);
}

testDirectDatabaseQuery().catch(console.error);