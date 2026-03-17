// Get agent ID for testing
const API_BASE = 'http://localhost:3004';

async function getAgentId() {
  try {
    console.log('🔍 Fetching agents...');
    
    const response = await fetch(`${API_BASE}/api/agents`);
    if (!response.ok) {
      console.log('❌ Failed to fetch agents:', await response.text());
      return;
    }
    
    const result = await response.json();
    console.log('✅ Agents found:', result);
    
    if (result.agents && result.agents.length > 0) {
      const agentId = result.agents[0].id;
      console.log(`\n🎯 Use this agent ID for testing: ${agentId}`);
      return agentId;
    } else {
      console.log('❌ No agents found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getAgentId();