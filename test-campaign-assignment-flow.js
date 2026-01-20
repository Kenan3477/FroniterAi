// Simple test to assign campaign via the working Railway backend
const fetch = require('node-fetch');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function testCampaignAssignment() {
  try {
    console.log('🔍 Testing campaign assignment flow...');
    
    // 1. First try to login to get a valid token
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test5@kennex.co.uk',
        password: 'temp123'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success) {
      console.log('❌ Login failed, cannot test campaign assignment');
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Got auth token');
    
    // 2. Try to get all campaigns first
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Campaigns response status:', campaignsResponse.status);
    const campaignsData = await campaignsResponse.json();
    console.log('Available campaigns:', JSON.stringify(campaignsData.data?.slice(0, 2), null, 2));
    
    // 3. Try to get user campaigns for user 1 
    const userCampaignsResponse = await fetch(`${BACKEND_URL}/api/admin/users/1/campaigns`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('User campaigns response status:', userCampaignsResponse.status);
    const userCampaignsData = await userCampaignsResponse.json();
    console.log('User campaigns:', JSON.stringify(userCampaignsData, null, 2));
    
    // 4. If we have campaigns but user has none, try to assign one
    if (campaignsData.success && campaignsData.data.length > 0 && 
        (!userCampaignsData.data || userCampaignsData.data.length === 0)) {
      
      const firstCampaign = campaignsData.data[0];
      console.log(`🔄 Attempting to assign campaign ${firstCampaign.campaignId} to user 1...`);
      
      // Try via campaign management join-agent endpoint
      const assignResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${firstCampaign.campaignId}/join-agent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId: '1' })
      });
      
      console.log('Assignment response status:', assignResponse.status);
      const assignData = await assignResponse.json();
      console.log('Assignment response:', JSON.stringify(assignData, null, 2));
      
      // 5. Check user campaigns again after assignment
      const updatedUserCampaignsResponse = await fetch(`${BACKEND_URL}/api/admin/users/1/campaigns`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const updatedUserCampaignsData = await updatedUserCampaignsResponse.json();
      console.log('User campaigns after assignment:', JSON.stringify(updatedUserCampaignsData, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing campaign assignment:', error);
  }
}

testCampaignAssignment();