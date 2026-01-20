// Debug script to check what's happening with the campaign assignment
const fetch = require('node-fetch');

const FRONTEND_URL = 'http://localhost:3001';
const authCookie = 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdDVAa2VubmV4LmNvLnVrIiwibmFtZSI6IktlbmFuIFRlc3RlciIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTczNzc0MjEzOCwiZXhwIjoxNzM3ODI4NTM4fQ.MjfTd0LzE9LNTw6aWGbIqJq30NeHb4tBYcPwGOQ4V9k';

async function debugCampaignAssignment() {
  try {
    console.log('🔍 Testing campaign assignment debug...');
    
    // Get campaigns to see structure
    const campaignsResponse = await fetch(`${FRONTEND_URL}/api/admin/campaign-management/campaigns`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      }
    });
    
    const campaignsData = await campaignsResponse.json();
    console.log('\\n📋 Available campaigns:');
    campaignsData.data.forEach(campaign => {
      console.log(`Campaign: ${campaign.campaignId} - ${campaign.name}`);
      console.log('  Assigned agents:', campaign.assignedAgents);
      campaign.assignedAgents.forEach(agent => {
        console.log(`    Agent: ID="${agent.id}", agentId="${agent.agentId || 'N/A'}", email="${agent.email}"`);
      });
      console.log('');
    });
    
    // Test the specific user we're looking for
    console.log('\\n🔍 Testing user 1 campaign assignments...');
    const userCampaignsResponse = await fetch(`${FRONTEND_URL}/api/admin/users/1/campaigns`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie
      }
    });
    
    const userCampaignsData = await userCampaignsResponse.json();
    console.log('User campaigns result:', JSON.stringify(userCampaignsData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCampaignAssignment();