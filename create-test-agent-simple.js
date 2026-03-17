#!/usr/bin/env node

/**
 * Create or update agent for inbound call testing
 */

const axios = require('axios');

async function createTestAgent() {
    console.log('👤 Creating test agent for inbound calls...\n');
    
    const backendUrl = 'http://localhost:3004';
    
    try {
        // Create agent record
        console.log('📝 Creating agent record...');
        const createResponse = await axios.post(`${backendUrl}/api/agents`, {
            agentId: 'agent-browser',
            firstName: 'Test',
            lastName: 'Agent',
            email: 'test@omnivox.ai',
            status: 'Available'
        });
        
        console.log('✅ Agent creation response:', createResponse.data);
        
        // Update agent status to Available and logged in
        console.log('🔄 Updating agent status to Available...');
        const updateResponse = await axios.put(`${backendUrl}/api/agents/agent-browser/status`, {
            status: 'Available',
            isLoggedIn: true
        });
        
        console.log('✅ Status update response:', updateResponse.data);
        
        // Verify agent status
        console.log('🔍 Verifying agent status...');
        const checkResponse = await axios.get(`${backendUrl}/api/agents/agent-browser`);
        console.log('📊 Agent status:', checkResponse.data);
        
    } catch (error) {
        console.error('❌ Error creating agent:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the creation
if (require.main === module) {
    createTestAgent().catch(console.error);
}

module.exports = { createTestAgent };