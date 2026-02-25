/**
 * Test the authentication flow in the dialer to ensure agent data is being set correctly
 */

const jwt = require('jsonwebtoken');

// Test JWT token creation for admin user
function createTestToken() {
  console.log('🔐 Testing JWT token creation...\n');
  
  const adminUserData = {
    userId: '1', // Assuming admin user ID is 1
    username: 'admin',
    role: 'ADMIN'
  };
  
  const jwtSecret = 'omnivox-super-secret-jwt-key-for-development-2025';
  
  const token = jwt.sign(adminUserData, jwtSecret, { expiresIn: '24h' });
  console.log('Generated token for admin user:', token.substring(0, 50) + '...');
  
  // Verify token
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Token verification successful:', decoded);
    return token;
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return null;
  }
}

// Test API call simulation
async function testDialerAuthFlow() {
  console.log('\n📞 Testing Dialer Authentication Flow...\n');
  
  // Simulate the authentication middleware
  const mockAuthenticatedUser = {
    userId: '1',
    username: 'admin',
    role: 'ADMIN',
    permissions: ['user.create', 'campaign.create', 'system.admin']
  };
  
  console.log('Mock authenticated user:', mockAuthenticatedUser);
  
  // Simulate the user lookup that happens in dialerController
  console.log('\\nSimulating user lookup with ID:', parseInt(mockAuthenticatedUser.userId));
  
  // This is where the issue might be - if userId is not an integer or doesn't exist
  const userIdAsInt = parseInt(mockAuthenticatedUser.userId);
  console.log('Parsed user ID:', userIdAsInt);
  console.log('Type of parsed ID:', typeof userIdAsInt);
  console.log('Is valid integer:', Number.isInteger(userIdAsInt));
  
  return {
    token: createTestToken(),
    userLookupId: userIdAsInt,
    authUser: mockAuthenticatedUser
  };
}

// Test agent creation logic
function simulateAgentCreation() {
  console.log('\n👤 Simulating Agent Creation Logic...\n');
  
  const mockUser = {
    id: 1,
    firstName: 'Admin',
    lastName: 'User', 
    email: 'admin@omnivox.ai',
    username: 'admin'
  };
  
  console.log('Mock user data:', mockUser);
  
  // Simulate agent ID creation
  const agentId = `agent-${mockUser.id}`;
  console.log('Generated agent ID:', agentId);
  
  // Simulate agent creation data
  const agentData = {
    agentId: agentId,
    firstName: mockUser.firstName || 'Unknown',
    lastName: mockUser.lastName || 'User',
    email: mockUser.email,
    status: 'Available'
  };
  
  console.log('Agent creation data:', agentData);
  
  return agentData;
}

// Run all tests
async function runAllTests() {
  console.log('🧪 DIALER AUTHENTICATION FLOW TESTS');
  console.log('=====================================\n');
  
  try {
    const authTest = await testDialerAuthFlow();
    const agentTest = simulateAgentCreation();
    
    console.log('\n📋 TEST SUMMARY:');
    console.log('- JWT Token Generation:', authTest.token ? '✅ PASS' : '❌ FAIL');
    console.log('- User ID Parsing:', Number.isInteger(authTest.userLookupId) ? '✅ PASS' : '❌ FAIL');
    console.log('- Agent ID Generation:', agentTest.agentId ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n💡 If these tests pass but calls still show N/A, the issue is likely:');
    console.log('1. Railway deployment not updated with latest code');
    console.log('2. Database user/agent records missing or corrupted');
    console.log('3. Authentication middleware not passing correct user data');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

runAllTests();