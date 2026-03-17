/**
 * Fix Dialer AgentId Issue
 * Create an agent record that can be used for manual dial calls
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// Use Railway backend
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function fixDialerAgentId() {
  try {
    console.log('🔧 Fixing Dialer AgentId Issue');
    console.log('=====================================');
    
    // Step 1: Check what agents exist in Railway database
    console.log('\n1. 📊 Checking existing agents via backend API...');
    
    try {
      const agentStatusResponse = await axios.get(`${BACKEND_URL}/api/agent/status`);
      console.log('✅ Agent status response:', JSON.stringify(agentStatusResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Agent status check failed:', error.response?.data || error.message);
    }
    
    // Step 2: Try to create agent directly via backend API
    console.log('\n2. 🏗️  Creating agent via backend API...');
    
    try {
      const createAgentResponse = await axios.post(`${BACKEND_URL}/api/agents`, {
        agentId: 'agent-001',
        firstName: 'Manual',
        lastName: 'Dialer',
        email: 'dialer@omnivox.ai',
        status: 'AVAILABLE'
      });
      console.log('✅ Agent creation response:', JSON.stringify(createAgentResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️  Agent creation error (may already exist):', error.response?.data || error.message);
    }
    
    // Step 3: Test the call API
    console.log('\n3. 📞 Testing manual dial call...');
    
    try {
      const callResponse = await axios.post(`${BACKEND_URL}/api/calls/call-rest-api`, {
        to: '+447487723751'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ Call API SUCCESS:', JSON.stringify(callResponse.data, null, 2));
      console.log('\n🎉 DIALER ISSUE FIXED!');
      console.log('The phone dialer should now work in the frontend.');
      
    } catch (error) {
      if (error.response) {
        console.log('❌ Call API failed with response:', JSON.stringify(error.response.data, null, 2));
        console.log('Status code:', error.response.status);
      } else {
        console.log('❌ Call API failed:', error.message);
      }
      
      if (error.response?.data?.error?.includes('Foreign key constraint')) {
        console.log('\n🔍 DIAGNOSIS: Agent record still not found in database');
        console.log('This might be because:');
        console.log('1. Backend changes not deployed to Railway yet');
        console.log('2. Agent creation API not working');
        console.log('3. Database schema mismatch');
      }
    }
    
    // Step 4: Alternative - Update backend controller
    console.log('\n4. 📝 ALTERNATIVE SOLUTION:');
    console.log('If the call still fails, the backend controller needs to be updated');
    console.log('to either:');
    console.log('a) Create agent record on-the-fly during call');
    console.log('b) Use a nullable agentId field');
    console.log('c) Use a default/system agent');
    
  } catch (error) {
    console.error('❌ Error in fix script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDialerAgentId();