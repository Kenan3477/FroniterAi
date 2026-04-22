// Test script to measure call placement speed improvement
const fetch = require('node-fetch');

async function testCallPlacementSpeed() {
    console.log('🚀 Testing Fast Dial Performance...\n');
    
    const backendUrl = 'https://froniterai-production.up.railway.app';
    
    // Test configuration
    const testCall = {
        to: '+447700900123', // UK test number
        contactName: 'Performance Test',
        campaignId: 'DAC',
        campaignName: 'Performance Testing'
    };
    
    try {
        console.log('🔑 Getting auth token...');
        
        // First get an auth token (you'll need to replace with actual login)
        const loginResponse = await fetch(`${backendUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed - please ensure backend is deployed and accessible');
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Auth token obtained');
        console.log('📞 Testing call placement speed...');
        console.log('   Target number:', testCall.to);
        console.log('   Expected improvement: < 500ms (down from 2-5 seconds)\n');
        
        // Test the optimized fast dial
        const startTime = Date.now();
        
        const callResponse = await fetch(`${backendUrl}/api/calls/rest-api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(testCall)
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️  Call placement took: ${duration}ms`);
        
        if (callResponse.ok) {
            const callData = await callResponse.json();
            console.log('✅ Call placement successful!');
            console.log('   Call SID:', callData.callSid);
            console.log('   Conference ID:', callData.conferenceId);
            console.log('   Status:', callData.status);
            console.log('   Message:', callData.message);
            
            // Performance analysis
            if (duration < 500) {
                console.log('\n🚀 EXCELLENT: Call placement under 500ms - optimization successful!');
            } else if (duration < 1000) {
                console.log('\n✅ GOOD: Call placement under 1 second - significant improvement');
            } else if (duration < 2000) {
                console.log('\n⚠️  OK: Call placement under 2 seconds - some improvement');
            } else {
                console.log('\n❌ SLOW: Call placement still over 2 seconds - optimization may not be deployed yet');
            }
            
        } else {
            const error = await callResponse.text();
            console.log('❌ Call placement failed:', error);
            console.log('   Duration before failure:', duration + 'ms');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCallPlacementSpeed().then(() => {
    console.log('\n🏁 Performance test completed');
}).catch(console.error);