// Debug script to test login/logout report directly
const fetch = require('node-fetch');

const FRONTEND_URL = 'https://omnivox-ai.vercel.app';

async function testLoginLogoutReport() {
  try {
    console.log('🔍 Testing login/logout report endpoint...');
    
    // Test the report generation endpoint directly
    const reportUrl = `${FRONTEND_URL}/api/admin/reports/generate?type=login_logout`;
    console.log('Testing URL:', reportUrl);
    
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This won't work without auth, but we can see the response
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('Response body:', responseText);

    // Test the view page URL
    const viewUrl = `${FRONTEND_URL}/reports/view?type=login_logout&category=users&subcategory=login_logout`;
    console.log('\\n📄 Testing view page URL:', viewUrl);

  } catch (error) {
    console.error('❌ Error testing report:', error.message);
  }
}

testLoginLogoutReport();