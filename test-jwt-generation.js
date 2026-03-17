/**
 * Direct test of JWT token generation to verify the fix works
 */

const jwt = require('jsonwebtoken');

// Test JWT token generation with the same secret as frontend
const jwtSecret = 'kennex-super-secret-jwt-key-for-production-2025';

console.log('🔑 Testing JWT Token Generation\n');

try {
  // Generate the same token as frontend local bypass
  const mockUser = {
    id: 1,
    username: 'admin',
    role: 'ADMIN'
  };

  const realToken = jwt.sign(
    { 
      userId: mockUser.id, 
      username: mockUser.username, 
      role: mockUser.role 
    },
    jwtSecret,
    { expiresIn: '24h' }
  );

  console.log('✅ JWT Token Generated Successfully!');
  console.log(`📊 Token length: ${realToken.length}`);
  console.log(`📋 Token preview: ${realToken.substring(0, 50)}...`);
  console.log(`🔍 Token contains dots: ${realToken.includes('.') ? 'YES' : 'NO'}`);
  
  // Verify token can be decoded
  try {
    const decoded = jwt.verify(realToken, jwtSecret);
    console.log('✅ Token verification successful!');
    console.log('📦 Decoded payload:', JSON.stringify(decoded, null, 2));
  } catch (verifyError) {
    console.log('❌ Token verification failed:', verifyError.message);
  }
  
  // Test with backend API
  console.log('\n🧪 Testing Backend API with Generated Token...');
  
  const backendUrl = 'https://froniterai-production.up.railway.app';
  
  const fetch = require('node-fetch');
  
  fetch(`${backendUrl}/api/dispositions/configs`, {
    headers: {
      'Authorization': `Bearer ${realToken}`,
      'Content-Type': 'application/json',
    },
  }).then(response => {
    console.log(`📊 Backend response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }).then(data => {
    console.log('✅ Backend authentication successful!');
    console.log(`📋 Loaded ${data.data?.length || 0} disposition configurations`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n🎯 Real Disposition Configurations:');
      data.data.slice(0, 5).forEach((disp, index) => {
        console.log(`  ${index + 1}. "${disp.label || disp.name}" (ID: ${disp.id})`);
      });
      
      console.log('\n🎉 SUCCESS: JWT token works with backend!');
      console.log('✅ Frontend JWT fix should resolve disposition ID issues');
    }
  }).catch(error => {
    console.log('❌ Backend test failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('💡 Possible issues:');
      console.log('  - JWT secret mismatch between environments');
      console.log('  - Backend authentication middleware rejecting token');
      console.log('  - Token payload format not matching backend expectations');
    }
  });
  
} catch (error) {
  console.error('❌ JWT generation failed:', error);
}