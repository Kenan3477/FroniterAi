// Debug specific validation errors in Twilio import
const axios = require('axios');

const BACKEND_URL = 'https://omnivox-ai-backend-production.up.railway.app';

// Test the import endpoint and capture detailed error information
async function testImportValidation() {
  console.log('🔍 Testing Twilio import validation...');
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/call-records/import-twilio-recordings`,
      {
        daysBack: 30,
        limit: 5 // Start with just 5 to debug
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-admin-token-here' // This will be manually added
        }
      }
    );
    
    console.log('✅ Import successful:', response.data);
    
  } catch (error) {
    console.error('❌ Import failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network error:', error.message);
    }
  }
}

// Also test a single record creation to isolate the issue
async function testSingleRecordCreation() {
  console.log('\n🔬 Testing single record creation directly...');
  
  // Simulate what the import does
  const sampleRecording = {
    sid: 'RE_test_123',
    callSid: 'CA_test_456',
    duration: '45',
    dateCreated: new Date(),
    url: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE_test_123.mp3'
  };
  
  console.log('Sample recording data:', sampleRecording);
  
  // This would normally require direct database access
  console.log('⚠️  Single record test requires direct database access - run via backend');
}

testImportValidation();
testSingleRecordCreation();