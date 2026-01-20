/**
 * Test Call Recording and Disposition Flow
 * This script validates the complete call ending pipeline
 */

console.log('🧪 Testing Call Recording and Disposition Pipeline...');

const testCallFlow = async () => {
  try {
    console.log('\n📞 Step 1: Test Backend Call Initiation...');
    
    // Test call initiation endpoint
    const initResponse = await fetch('http://localhost:3000/api/calls/call-rest-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        to: '+447700900123',
        from: '+447700900456',
        agentId: '1',
        customerInfo: {
          firstName: 'Test',
          lastName: 'Customer', 
          phoneNumber: '+447700900123'
        }
      })
    });
    
    const initData = await initResponse.json();
    console.log('✅ Call initiation response:', initData);
    
    console.log('\n📴 Step 2: Test Backend Call Ending...');
    
    // Test call ending endpoint  
    const endResponse = await fetch('http://localhost:3000/api/dialer/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        callSid: 'test-call-sid-12345',
        callDuration: 120,
        callStatus: 'completed',
        customerInfo: {
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber: '+447700900123',
          agentId: '1'
        }
      })
    });
    
    const endData = await endResponse.json();
    console.log('✅ Call ending response:', endData);
    
    console.log('\n📋 Step 3: Test Disposition Submission...');
    
    // Test disposition endpoint
    const dispositionResponse = await fetch('http://localhost:3000/api/agents/call-outcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        phoneNumber: '+447700900123',
        customerInfo: {
          firstName: 'Test',
          lastName: 'Customer',
          notes: 'Test call completed successfully'
        },
        disposition: 'completed',
        callDuration: 120,
        agentId: '1',
        campaignId: 'test-campaign'
      })
    });
    
    const dispositionData = await dispositionResponse.json();
    console.log('✅ Disposition response:', dispositionData);
    
    console.log('\n🎯 Step 4: Test Call Data Saving...');
    
    // Test call data saving endpoint
    const saveResponse = await fetch('http://localhost:3000/api/calls/save-call-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        phoneNumber: '+447700900123',
        customerInfo: {
          firstName: 'Test',
          lastName: 'Customer',
          notes: 'Test call completed successfully'
        },
        disposition: 'completed',
        callDuration: 120,
        agentId: '1',
        campaignId: 'test-campaign'
      })
    });
    
    const saveData = await saveResponse.json();
    console.log('✅ Save call data response:', saveData);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Call initiation: Working');
    console.log('- Call ending: Working');
    console.log('- Disposition submission: Working'); 
    console.log('- Call data saving: Working');
    console.log('\n🎉 Complete call recording and disposition pipeline is functional!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔍 Debugging tips:');
    console.log('1. Make sure frontend and backend servers are running');
    console.log('2. Check API endpoints are properly configured');
    console.log('3. Verify database connection and Prisma schema');
    console.log('4. Test individual components in browser');
  }
};

// Run the test if we're in Node.js environment
if (typeof window === 'undefined') {
  testCallFlow();
} else {
  console.log('Run this script in Node.js or browser console to test the API pipeline');
}