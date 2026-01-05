// Browser Console Test - Copy and paste this into your browser console

console.log('🧪 Testing Inbound Numbers API...');

// Test 1: Check auth cookie
const authCookie = document.cookie.split('; ').find(row => row.startsWith('auth-token='));
console.log('🔒 Auth Cookie:', authCookie ? 'EXISTS' : 'MISSING');
if (authCookie) {
  const token = authCookie.split('=')[1];
  console.log('🔒 Token length:', token.length);
  console.log('🔒 Token preview:', token.substring(0, 20) + '...');
}

// Test 2: Make API call and log everything
fetch('/api/voice/inbound-numbers')
  .then(response => {
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    return response.json();
  })
  .then(data => {
    console.log('📦 API Response:', data);
    
    if (data.success && data.data) {
      console.log('✅ API call successful');
      console.log('📊 Numbers returned:', data.data.length);
      data.data.forEach((num, i) => {
        console.log(`   ${i + 1}. ${num.phoneNumber} - ${num.displayName}`);
      });
    } else if (!data.success) {
      console.log('❌ API call failed:', data.error);
    } else {
      console.log('⚠️ Unexpected response structure');
    }
  })
  .catch(error => {
    console.error('❌ Network error:', error);
  });

console.log('🧪 Test commands sent. Check the logs above.');