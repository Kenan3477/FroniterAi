/**
 * Test script to verify the fixed authentication flow
 * This will test that the frontend generates real JWT tokens and can authenticate with backend
 */

// Test configuration
const frontendUrl = 'http://localhost:3001';
const backendUrl = 'https://froniterai-production.up.railway.app';
const localTestCredentials = {
  email: 'admin@omnivox.ai',
  password: 'admin123'
};

async function testCompleteAuthFlow() {
  console.log('🧪 Testing Complete Authentication Flow\n');
  
  try {
    // Step 1: Test frontend login API
    console.log('1️⃣ Testing frontend login API...');
    const loginResponse = await fetch(`${frontendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localTestCredentials),
    });

    console.log(`📊 Login response status: ${loginResponse.status} ${loginResponse.statusText}`);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('❌ Login failed:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('📦 Login response:', JSON.stringify(loginData, null, 2));
    
    // Step 2: Analyze the token
    const token = loginData.token;
    if (!token) {
      console.log('❌ No token received from login');
      return;
    }
    
    console.log(`\n2️⃣ Analyzing received token...`);
    console.log(`  Token length: ${token.length}`);
    console.log(`  Token preview: ${token.substring(0, 50)}...`);
    
    if (token.startsWith('temp_local_token_')) {
      console.log('  ❌ FAKE TOKEN: Still receiving temp local token!');
      console.log('  💡 The frontend login fix may not be working');
      return;
    } else if (token.includes('.')) {
      console.log('  ✅ REAL JWT TOKEN: Contains dots (proper JWT format)');
      
      // Try to decode JWT header to verify
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const header = JSON.parse(atob(parts[0]));
          console.log('  📋 JWT Header:', header);
          console.log('  🎯 This appears to be a valid JWT token!');
        }
      } catch (e) {
        console.log('  ⚠️  Could not decode JWT header, but format looks correct');
      }
    } else {
      console.log('  ⚠️  Unexpected token format');
    }
    
    // Step 3: Test backend authentication with the token
    console.log(`\n3️⃣ Testing backend API with received token...`);
    const dispositionResponse = await fetch(`${backendUrl}/api/dispositions/configs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Dispositions API status: ${dispositionResponse.status} ${dispositionResponse.statusText}`);
    
    if (dispositionResponse.ok) {
      const dispositionData = await dispositionResponse.json();
      console.log('✅ Backend authentication successful!');
      console.log(`📋 Loaded ${dispositionData.data?.length || 0} disposition configurations`);
      
      if (dispositionData.data && dispositionData.data.length > 0) {
        console.log('\n🎯 Real Disposition Configurations Found:');
        dispositionData.data.slice(0, 5).forEach((disp, index) => {
          console.log(`  ${index + 1}. "${disp.label || disp.name}" (ID: ${disp.id})`);
        });
        
        console.log('\n🎉 SUCCESS: Complete authentication flow working!');
        console.log('✅ Frontend → Real JWT Token → Backend API → Real Disposition IDs');
        console.log('\n📝 Next Steps:');
        console.log('  1. Frontend will now use real database IDs instead of fake ones');
        console.log('  2. Backend "Disposition not found" warnings should disappear');
        console.log('  3. No more graceful fallback needed');
        
      } else {
        console.log('⚠️  API worked but no disposition data found');
      }
    } else if (dispositionResponse.status === 401) {
      console.log('❌ Backend rejected the token - authentication failed');
      const errorText = await dispositionResponse.text();
      console.log('📄 Error details:', errorText);
      console.log('\n💡 Possible issues:');
      console.log('  - JWT secret mismatch between frontend and backend');
      console.log('  - Token format not compatible with backend expectations');
      console.log('  - Backend middleware rejecting local bypass tokens');
    } else {
      console.log('❌ Backend API error');
      const errorText = await dispositionResponse.text();
      console.log('📄 Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteAuthFlow().then(() => {
  console.log('\n🏁 Authentication flow test completed');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});