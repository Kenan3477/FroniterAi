// Debug frontend authentication flow
const fetch = require('node-fetch');

async function debugFrontendAuth() {
  console.log('🔍 Debugging frontend authentication flow...');
  
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Step 1: Try login through frontend
    console.log('1️⃣ Testing frontend login...');
    
    const loginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test.admin@omnivox.com',
        password: 'TestAdmin123!'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response data:', JSON.stringify(loginData, null, 2));
    
    if (!loginResponse.ok) {
      console.log('❌ Frontend login failed, checking what users are available...');
      
      // Test with different credentials
      const testCredentials = [
        { email: 'admin@omnivox.ai', password: 'admin123' },
        { email: 'test@example.com', password: 'test123' },
        { email: 'kenan@couk', password: 'test123' }
      ];
      
      for (const creds of testCredentials) {
        console.log(`\nTrying ${creds.email}...`);
        const altLoginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(creds)
        });
        
        if (altLoginResponse.ok) {
          const altLoginData = await altLoginResponse.json();
          console.log(`✅ Login successful with ${creds.email}`);
          console.log('Token data:', JSON.stringify(altLoginData, null, 2));
          
          // Test the reports endpoint with this token
          const token = altLoginData.token || altLoginData.data?.token;
          if (token) {
            console.log('\n2️⃣ Testing reports endpoint with token...');
            
            const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Report response status:', reportResponse.status);
            const reportData = await reportResponse.json();
            console.log('Report response data:', JSON.stringify(reportData, null, 2));
          }
          
          return; // Exit on first successful login
        } else {
          console.log(`❌ Failed with ${creds.email}`);
        }
      }
      
      return;
    }
    
    // If we get here, the original login was successful
    const token = loginData.token || loginData.data?.token;
    console.log('✅ Frontend login successful with test.admin@omnivox.com');
    
    if (token) {
      console.log('\n2️⃣ Testing reports endpoint with token...');
      
      const reportResponse = await fetch(`${FRONTEND_URL}/api/admin/reports/generate?type=login_logout&startDate=2026-02-18&endDate=2026-02-20`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Report response status:', reportResponse.status);
      const reportData = await reportResponse.json();
      console.log('Report response data:', JSON.stringify(reportData, null, 2));
    } else {
      console.log('❌ No token received from frontend login');
    }
    
  } catch (error) {
    console.error('❌ Error in frontend auth debug:', error);
  }
}

debugFrontendAuth();