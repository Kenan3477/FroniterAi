#!/usr/bin/env node

/**
 * Test the updated disposition saving API with proper data structure
 */

async function testUpdatedDisposition() {
    try {
        console.log('🧪 Testing UPDATED disposition saving API...\n');

        const testData = {
            phoneNumber: '+447700900123',
            customerInfo: {
                firstName: 'Test', 
                lastName: 'Customer',
                phone: '+447700900123',
                email: 'test@example.com'
            },
            disposition: {
                outcome: 'COMPLETED',
                notes: 'Test call disposition - updated version'
            },
            callDuration: 60,
            agentId: 'agent-browser', // Match what the system uses
            campaignId: 'manual-dial' // Use a standard campaign ID
        };

        console.log('📤 Sending updated disposition data:', JSON.stringify(testData, null, 2));
        console.log('\n📋 Manual test instructions:');
        console.log('1. Make sure you are logged into Omnivox');
        console.log('2. Open browser console');
        console.log('3. Run this command:');
        console.log(`
fetch('/api/calls/save-call-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(testData)})
}).then(response => {
  console.log('Status:', response.status);
  return response.json();
}).then(data => {
  console.log('Result:', data);
}).catch(error => {
  console.error('Error:', error);
});
        `);

        console.log('\n🔍 Expected changes:');
        console.log('✅ Should provide proper firstName/lastName for contact creation');
        console.log('✅ Should include listId for contact schema compliance');
        console.log('✅ Should validate agent and campaign existence before foreign key insertion');
        console.log('✅ Should provide detailed error logging for debugging');
        
        console.log('\n🎯 After testing, you should see:');
        console.log('- No more 500 errors');
        console.log('- Successful disposition saving'); 
        console.log('- Contact and interaction records created');

    } catch (error) {
        console.error('💥 Test setup failed:', error.message);
    }
}

testUpdatedDisposition();