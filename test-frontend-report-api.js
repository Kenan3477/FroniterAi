// Test the frontend API route directly
const fetch = require('node-fetch');

async function testFrontendReportAPI() {
  try {
    console.log('🔍 Testing frontend report API directly...');
    
    const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
    
    // Test with the same date range as shown in the UI
    const params = new URLSearchParams({
      type: 'login_logout',
      startDate: '2026-02-12',  // 7 days ago
      endDate: '2026-02-19'     // today
    });
    
    console.log('📅 Test parameters:');
    console.log('  - type:', 'login_logout');
    console.log('  - startDate:', '2026-02-12');
    console.log('  - endDate:', '2026-02-19');
    
    const url = `${FRONTEND_URL}/api/admin/reports/generate?${params.toString()}`;
    console.log('🌐 Test URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without auth, but we can see the response structure
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText.substring(0, 1000));
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Parsed response:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('❌ Failed to parse JSON response');
      }
    }

  } catch (error) {
    console.error('❌ Error testing frontend API:', error.message);
  }
}

testFrontendReportAPI();