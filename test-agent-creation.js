// Quick script to create an agent record for testing campaign assignment
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function createAgentForTesting() {
  try {
    // Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });

    const loginData = await loginResponse.json();
    const authToken = loginData.data.token;
    console.log('✅ Admin logged in successfully');

    // Try to create agent via direct database approach
    // Since we don't have an agents endpoint, let's see what endpoints are available
    console.log('📋 Available endpoints for agent creation...');
    
    // We'll use the campaign assignment approach
    // But first create the agent record through a different method
    
    console.log('🆕 The issue is we need an Agent record in the database');
    console.log('   Current problem: agentId "agent_001" doesn\'t exist in agents table');
    console.log('   Campaign ID "FOLLOW-UP-2025" does exist');
    console.log('');
    console.log('🔧 Solutions:');
    console.log('1. Deploy backend with agent creation endpoint');
    console.log('2. Manually create agent records in database');
    console.log('3. Modify backend to auto-create agents on assignment');
    console.log('');
    console.log('💡 For testing, we need to either:');
    console.log('   - Create agent records that correspond to users');
    console.log('   - Use existing agent records if any exist');
    console.log('   - Modify the system to handle user->agent mapping');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAgentForTesting();