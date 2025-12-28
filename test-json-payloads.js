const fetch = require('node-fetch');

// Simplified test: Compare JSON payloads that would be sent to backend
async function comparePayloads() {
    console.log('🔍 COMPARING PAYLOADS: Frontend vs Direct Backend\n');
    
    // Test data - exactly what frontend sends
    const userData = {
        name: 'Payload Test User',
        email: 'payload.test@example.com',
        password: 'Kenan3477!',
        role: 'AGENT',
        status: 'ACTIVE',
        department: '',
        phoneNumber: ''
    };
    
    console.log('📋 Original User Data:');
    console.log(JSON.stringify(userData, null, 2));
    console.log('');
    
    // Check JSON stringification
    const jsonPayload = JSON.stringify(userData);
    console.log('🔗 JSON Payload:');
    console.log(jsonPayload);
    console.log('');
    
    // Parse it back to see if anything changes
    const parsedBack = JSON.parse(jsonPayload);
    console.log('🔄 Parsed Back:');
    console.log(JSON.stringify(parsedBack, null, 2));
    console.log('');
    
    // Check if password is intact
    const passwordIntact = parsedBack.password === userData.password;
    console.log(`🔐 Password intact after JSON round-trip: ${passwordIntact ? '✅' : '❌'}`);
    
    if (!passwordIntact) {
        console.log(`   Original: "${userData.password}"`);
        console.log(`   After:    "${parsedBack.password}"`);
    }
    
    // Test different special characters
    console.log('\n🧪 Testing different passwords:');
    const testPasswords = [
        'Kenan3477!',
        'Test123!@#',
        'Password$123',
        'Simple123',
        'Complex!@#$%^&*()_+-=[]{}|;:,.<>?'
    ];
    
    for (const testPwd of testPasswords) {
        const testData = { ...userData, password: testPwd };
        const testJson = JSON.stringify(testData);
        const testParsed = JSON.parse(testJson);
        const isOk = testParsed.password === testPwd;
        console.log(`   "${testPwd}": ${isOk ? '✅' : '❌'}`);
        if (!isOk) {
            console.log(`      Original: "${testPwd}"`);
            console.log(`      Parsed:   "${testParsed.password}"`);
        }
    }
    
    console.log('\n📊 Conclusion: ');
    console.log('If all passwords remain intact through JSON processing,');
    console.log('then the issue is NOT in the frontend proxy layer JSON handling.');
    console.log('The issue would be in the actual HTTP request/response cycle or backend processing.');
}

comparePayloads();