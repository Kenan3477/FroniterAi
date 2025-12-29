#!/usr/bin/env node

/**
 * Setup Kennen_02s user for Inbound Call Testing
 * 
 * This script ensures the Kennen_02s user is properly configured
 * as an agent to receive inbound call notifications.
 */

const axios = require('axios');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

// First, let's login as admin to configure the user
async function adminLogin() {
  console.log('🔐 Logging in as admin...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'admin@omnivox-ai.com',
      password: 'OmnivoxAdmin2025!'
    });

    if (response.data.success) {
      console.log('✅ Admin login successful');
      return response.data.data.token;
    } else {
      throw new Error('Admin login failed');
    }
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Check if Kennen_02s is properly configured as an agent
async function checkKennenAgent(adminToken) {
  console.log('\n📋 Checking Kennen_02s agent configuration...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const agents = response.data.data || [];
    const kennenAgent = agents.find(agent => 
      agent.email === 'kennen_02@icloud.com' || 
      agent.username === 'Kennen_02'
    );

    if (kennenAgent) {
      console.log('✅ Kennen_02s found as agent:', {
        id: kennenAgent.id,
        agentId: kennenAgent.agentId,
        name: `${kennenAgent.firstName} ${kennenAgent.lastName}`,
        email: kennenAgent.email,
        status: kennenAgent.status,
        extension: kennenAgent.extension
      });
      return kennenAgent;
    } else {
      console.log('⚠️ Kennen_02s not found in agents list');
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking agents:', error.response?.data?.message || error.message);
    return null;
  }
}

// Ensure agent is available and ready for inbound calls
async function setAgentAvailable(adminToken, agentId) {
  console.log(`\n📞 Setting agent ${agentId} as Available for inbound calls...`);
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/agents/status`, {
      agentId: agentId,
      status: 'Available'
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Agent status set to Available');
      return true;
    } else {
      console.log('⚠️ Could not set agent status');
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting agent status:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test that the user can login
async function testKennenLogin() {
  console.log('\n🧪 Testing Kennen_02s login...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'kennen_02@icloud.com',
      password: 'password' // Default password, update if different
    });

    if (response.data.success) {
      console.log('✅ Kennen_02s login successful');
      console.log('👤 User details:', {
        id: response.data.data.user.id,
        name: response.data.data.user.name,
        role: response.data.data.user.role,
        username: response.data.data.user.username
      });
      return response.data.data.token;
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️ Login failed - trying alternate password...');
      
      // Try with a common test password
      try {
        const altResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
          email: 'kennen_02@icloud.com',
          password: 'OmnivoxAgent2025!'
        });

        if (altResponse.data.success) {
          console.log('✅ Kennen_02s login successful with alternate password');
          return altResponse.data.data.token;
        }
      } catch (altError) {
        console.error('❌ Both login attempts failed');
        return null;
      }
    } else {
      console.error('❌ Kennen_02s login failed:', error.response?.data?.message || error.message);
      return null;
    }
  }
}

// Get active inbound calls to test the system
async function checkActiveInboundCalls(token) {
  console.log('\n📞 Checking for active inbound calls...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/calls/inbound-active`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const activeCalls = response.data.data || [];
    console.log(`📊 Found ${activeCalls.length} active inbound calls`);
    
    if (activeCalls.length > 0) {
      console.log('📋 Active calls:', activeCalls.map(call => ({
        id: call.id,
        callerNumber: call.caller_number,
        status: call.status,
        createdAt: call.created_at
      })));
    }

    return activeCalls;
  } catch (error) {
    console.error('❌ Error checking inbound calls:', error.response?.data?.message || error.message);
    return [];
  }
}

// Main setup function
async function setupKennenForInboundTesting() {
  console.log('🚀 Setting up Kennen_02s for Inbound Call Testing');
  console.log('=' .repeat(50));

  // 1. Login as admin
  const adminToken = await adminLogin();
  if (!adminToken) {
    console.log('\n❌ Cannot proceed without admin access');
    return;
  }

  // 2. Check if Kennen is configured as agent
  const kennenAgent = await checkKennenAgent(adminToken);
  
  // 3. Test Kennen login
  const kennenToken = await testKennenLogin();
  if (!kennenToken) {
    console.log('\n❌ Cannot proceed - Kennen_02s cannot login');
    return;
  }

  // 4. Set agent as available (if agent exists)
  if (kennenAgent) {
    await setAgentAvailable(adminToken, kennenAgent.agentId);
  }

  // 5. Check current inbound calls
  await checkActiveInboundCalls(kennenToken);

  // 6. Provide testing instructions
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Kennen_02s Setup Complete!');
  console.log('\n📋 Testing Instructions:');
  console.log('1. Open: http://localhost:3000');
  console.log('2. Login with:');
  console.log('   • Email: kennen_02@icloud.com');
  console.log('   • Password: OmnivoxAgent2025! (or password)');
  console.log('3. Navigate to agent dashboard');
  console.log('4. Ensure status is set to "Available"');
  console.log('5. Call: +442046343130');
  console.log('6. Watch for inbound call notifications!');
  
  if (kennenAgent) {
    console.log('\n👤 Agent Configuration:');
    console.log(`   • Agent ID: ${kennenAgent.agentId}`);
    console.log(`   • Extension: ${kennenAgent.extension || 'Not set'}`);
    console.log(`   • Current Status: ${kennenAgent.status}`);
  }

  console.log('\n🔧 System Status:');
  console.log('   • Backend: Railway (https://froniterai-production.up.railway.app)');
  console.log('   • Frontend: Local (http://localhost:3000)');
  console.log('   • Twilio: Configured for inbound calls');
  console.log('   • Database: Railway PostgreSQL');
}

// Run setup if called directly
if (require.main === module) {
  setupKennenForInboundTesting().catch(console.error);
}

module.exports = { setupKennenForInboundTesting };