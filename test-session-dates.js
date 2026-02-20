// Test user sessions date filtering
const fetch = require('node-fetch');

async function testSessionDateFiltering() {
  console.log('🔍 Testing user sessions date filtering...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Login to get token
    const loginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.admin@omnivox.com',
        password: 'TestAdmin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Test sessions without date filter
    console.log('1️⃣ Testing sessions without date filter...');
    
    const noDateResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=5`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const noDateData = await noDateResponse.json();
    console.log('No date filter sessions count:', noDateData.data?.sessions?.length || 0);
    if (noDateData.data?.sessions?.length > 0) {
      console.log('Sample sessions:');
      noDateData.data.sessions.slice(0, 3).forEach(session => {
        console.log(`  - ${session.user?.username}: ${session.loginTime} (${session.status})`);
      });
    }
    
    // Test sessions with date filter
    console.log('\n2️⃣ Testing sessions with Feb 18-20 date filter...');
    
    const withDateParams = new URLSearchParams({
      dateFrom: '2026-02-18',
      dateTo: '2026-02-20',
      limit: '10'
    });
    
    const withDateResponse = await fetch(
      `${BACKEND_URL}/api/admin/user-sessions?${withDateParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const withDateData = await withDateResponse.json();
    console.log('With date filter sessions count:', withDateData.data?.sessions?.length || 0);
    
    // Test sessions with just Feb 19th
    console.log('\n3️⃣ Testing sessions with Feb 19th only...');
    
    const feb19Params = new URLSearchParams({
      dateFrom: '2026-02-19',
      dateTo: '2026-02-19',
      limit: '10'
    });
    
    const feb19Response = await fetch(
      `${BACKEND_URL}/api/admin/user-sessions?${feb19Params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const feb19Data = await feb19Response.json();
    console.log('Feb 19 sessions count:', feb19Data.data?.sessions?.length || 0);
    
    // Test with different date formats
    console.log('\n4️⃣ Testing with different date formats...');
    
    const isoDateParams = new URLSearchParams({
      dateFrom: '2026-02-19T00:00:00Z',
      dateTo: '2026-02-19T23:59:59Z',
      limit: '10'
    });
    
    const isoDateResponse = await fetch(
      `${BACKEND_URL}/api/admin/user-sessions?${isoDateParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const isoDateData = await isoDateResponse.json();
    console.log('ISO date format sessions count:', isoDateData.data?.sessions?.length || 0);
    
  } catch (error) {
    console.error('❌ Error testing session date filtering:', error);
  }
}

testSessionDateFiltering();