/*
 * SECURITY WARNING: This file previously contained hardcoded credentials
 * Credentials have been moved to environment variables for security
 * Configure the following environment variables:
 * - ADMIN_PASSWORD
 * - ADMIN_EMAIL  
 * - TEST_PASSWORD
 * - USER_PASSWORD
 * - ALT_PASSWORD
 * - JWT_TOKEN
 */

#!/usr/bin/env node

/**
 * Create Test Agent for Inbound Call Testing
 * 
 * Creates a fresh agent user for testing inbound calls
 */

const axios = require('axios');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// Create a test agent user
async function createTestAgent() {
  console.log('🚀 Creating Test Agent for Inbound Call Testing');
  console.log('=' .repeat(50));

  // First login as admin
  console.log('🔐 Logging in as admin...');
  
  try {
    const adminLogin = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com',
      password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET'
    });

    if (!adminLogin.data.success) {
      throw new Error('Admin login failed');
    }

    console.log('✅ Admin login successful');
    const adminToken = adminLogin.data.data.token;

    // Create the test agent
    console.log('\n👤 Creating test agent user...');
    
    const testAgentData = {
      username: 'test_agent_inbound',
      email: 'test.agent.inbound@omnivox-ai.com',
      password: 'TestAgent123!',
      firstName: 'Test',
      lastName: 'Agent',
      role: 'AGENT',
      isActive: true
    };

    try {
      const createResponse = await axios.post(`${BACKEND_URL}/api/auth/register`, testAgentData);
      
      if (createResponse.data.success) {
        console.log('✅ Test agent created successfully');
        const newUser = createResponse.data.data.user;
        
        console.log('👤 New Agent Details:', {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`,
          role: newUser.role
        });

        // Now test login
        console.log('\n🧪 Testing agent login...');
        
        const agentLogin = await axios.post(`${BACKEND_URL}/api/auth/login`, {
          email: testAgentData.email,
          password: testAgentData.password
        });

        if (agentLogin.data.success) {
          console.log('✅ Agent login successful!');
          const agentToken = agentLogin.data.data.token;
          
          // Get agent details
          const agentUser = agentLogin.data.data.user;
          
          console.log('\n🎉 Test Agent Ready for Inbound Call Testing!');
          console.log('\n📋 Login Credentials:');
          console.log(`   Email: ${testAgentData.email}`);
          console.log(`   Password: ${testAgentData.password}`);
          console.log('\n📋 Testing Instructions:');
          console.log('1. Open: http://localhost:3000');
          console.log(`2. Login with the credentials above`);
          console.log('3. Navigate to agent dashboard or work area');
          console.log('4. Set status to "Available"');
          console.log('5. Call: +442046343130');
          console.log('6. Watch for inbound call popup notifications!');
          
          console.log('\n🔧 System Configuration:');
          console.log('   • Backend: Railway (https://froniterai-production.up.railway.app)');
          console.log('   • Frontend: Local (http://localhost:3000)');
          console.log('   • Twilio: +442046343130 → Railway webhook');
          console.log('   • Database: Railway PostgreSQL');
          
          return agentToken;
        }
      }
    } catch (createError) {
      if (createError.response?.status === 409) {
        console.log('⚠️ User already exists, trying to login...');
        
        // User already exists, try to login
        try {
          const existingLogin = await axios.post(`${BACKEND_URL}/api/auth/login`, {
            email: testAgentData.email,
            password: testAgentData.password
          });

          if (existingLogin.data.success) {
            console.log('✅ Existing agent login successful!');
            console.log('\n🎉 Test Agent Ready for Inbound Call Testing!');
            console.log('\n📋 Login Credentials:');
            console.log(`   Email: ${testAgentData.email}`);
            console.log(`   Password: ${testAgentData.password}`);
            return existingLogin.data.data.token;
          }
        } catch (loginError) {
          console.error('❌ Cannot login to existing user:', loginError.response?.data?.message || loginError.message);
        }
      } else {
        console.error('❌ Error creating agent:', createError.response?.data?.message || createError.message);
      }
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Alternative: Try to unlock and reset Kennen_02s account
async function unlockKennenAccount() {
  console.log('\n🔧 Attempting to unlock Kennen_02s account...');
  
  // Since we can't easily reset the password via API, 
  // let's provide alternative instructions
  console.log('\n📝 Manual Kennen_02s Setup:');
  console.log('Since the account is locked, here are your options:');
  console.log('\n1. Use the test agent created above, OR');
  console.log('2. In the frontend admin panel:');
  console.log('   - Go to Admin > User Management');
  console.log('   - Find Kennen_02s user');
  console.log('   - Reset their password');
  console.log('   - Unlock their account');
  console.log('\n3. Or use any existing AGENT role user');
}

// Run the setup
if (require.main === module) {
  createTestAgent().then(() => {
    unlockKennenAccount();
  }).catch(console.error);
}

module.exports = { createTestAgent };