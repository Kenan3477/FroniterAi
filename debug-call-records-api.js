/**
 * Debug script to check what the call records API is actually returning
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://omnivox-backend-production.up.railway.app';

async function debugCallRecordsAPI() {
  try {
    console.log('🔍 Testing direct API call to backend...');
    
    // Test 1: Direct backend API call (with any demo token)
    const backendResponse = await fetch(`${BACKEND_URL}/api/call-records`, {
      headers: {
        'Authorization': 'Bearer kenan-test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🌐 Backend Response Status:', backendResponse.status);
    const backendData = await backendResponse.text();
    console.log('🌐 Backend Response (first 500 chars):', backendData.substring(0, 500));
    
    try {
      const parsedBackend = JSON.parse(backendData);
      console.log('🌐 Backend Parsed Response:', parsedBackend);
    } catch (e) {
      console.log('🌐 Backend returned non-JSON response');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Local frontend API proxy call
    const frontendResponse = await fetch('http://localhost:3000/api/call-records', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('💻 Frontend Response Status:', frontendResponse.status);
    const frontendData = await frontendResponse.json();
    console.log('💻 Frontend Response:', frontendData);
    
    // Test 3: Check if there's any demo data in the response
    if (frontendData && frontendData.records) {
      console.log('\n📊 CALL RECORDS ANALYSIS:');
      console.log(`Total records: ${frontendData.records.length}`);
      
      frontendData.records.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          id: record.id,
          phone: record.phoneNumber,
          campaign: record.campaign?.name,
          startTime: record.startTime
        });
        
        if (record.phoneNumber === '+1234567890') {
          console.log(`🚨 FOUND DEMO RECORD: ${record.id}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugCallRecordsAPI();