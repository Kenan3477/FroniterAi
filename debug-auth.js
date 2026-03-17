/**
 * Simple Authentication Test for Recording API
 */

console.log('🔐 Testing Recording Authentication Flow\n');

// Test 1: Check if localStorage has auth tokens
console.log('📱 Frontend Authentication Status:');
const authToken = localStorage.getItem('auth-token');
const refreshToken = localStorage.getItem('refresh-token');
const user = localStorage.getItem('user');

console.log('   Auth Token:', authToken ? `${authToken.substring(0, 10)}...` : 'NOT FOUND');
console.log('   Refresh Token:', refreshToken ? 'EXISTS' : 'NOT FOUND');
console.log('   User Data:', user ? 'EXISTS' : 'NOT FOUND');

if (user) {
  try {
    const userData = JSON.parse(user);
    console.log('   User Role:', userData.role);
    console.log('   User ID:', userData.id);
  } catch (e) {
    console.log('   User Data Error:', e.message);
  }
}
console.log('');

// Test 2: Check cookies
console.log('🍪 Cookie Authentication Status:');
const cookies = document.cookie.split(';');
const authCookie = cookies.find(c => c.trim().startsWith('auth-token='));
console.log('   Auth Cookie:', authCookie ? 'EXISTS' : 'NOT FOUND');
if (authCookie) {
  console.log('   Cookie Value:', authCookie.split('=')[1]?.substring(0, 10) + '...');
}
console.log('');

// Test 3: Test recording API with different auth methods
async function testRecordingAPI() {
  const recordingId = 'cmlp67yhn000cmhih4hmhzm8r';
  const frontendUrl = `/api/recordings/${recordingId}/stream`;
  
  console.log('🎵 Testing Recording API Access:');
  console.log('   Recording ID:', recordingId);
  console.log('   Frontend URL:', frontendUrl);
  console.log('');

  // Method 1: Let frontend handle auth (current approach)
  console.log('📡 Method 1: Frontend Proxy (current)');
  try {
    const response = await fetch(frontendUrl);
    console.log('   Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('   Error Response:', errorText);
    } else {
      console.log('   ✅ Success! Recording should play');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  // Method 2: Direct backend with manual auth
  console.log('📡 Method 2: Direct Backend (manual auth)');
  if (authToken) {
    try {
      const backendUrl = `https://froniterai-production.up.railway.app/api/recordings/${recordingId}/stream`;
      const response = await fetch(backendUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('   Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('   Error Response:', errorText);
      } else {
        console.log('   ✅ Success! Direct backend access works');
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
  } else {
    console.log('   ⚠️ No auth token available for direct test');
  }
  console.log('');
}

// Test 4: Check if auth is valid
async function testAuthValidity() {
  console.log('🔍 Testing Auth Token Validity:');
  
  if (!authToken) {
    console.log('   ❌ No auth token to test');
    return;
  }
  
  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('   Profile API Status:', response.status, response.statusText);
    
    if (response.ok) {
      const profile = await response.json();
      console.log('   ✅ Auth token is valid');
      console.log('   User:', profile.email || profile.username);
      console.log('   Role:', profile.role);
    } else {
      console.log('   ❌ Auth token is invalid/expired');
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('   ❌ Auth test failed:', error.message);
  }
  console.log('');
}

// Run tests
testAuthValidity().then(() => testRecordingAPI());