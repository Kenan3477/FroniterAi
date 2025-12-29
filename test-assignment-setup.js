// Quick script to create agent record for user 119 to test campaign assignment
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function createAgentAndTestAssignment() {
  try {
    // Get admin token
    console.log('🔐 Getting admin token...');
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
    console.log('✅ Got admin token');

    // Get user 119 details
    console.log('👤 Getting user details...');
    const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const users = await usersResponse.json();
    const user119 = users.find(u => u.id === 119);
    console.log('✅ Found user:', user119.email, user119.name);

    // Since we can't create agent via API yet, let's test the assignment assuming 
    // the deployment will work. For now, let's verify the campaign assignment setup.

    // Test what campaign IDs are available
    console.log('📋 Getting available campaigns...');
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const campaignsData = await campaignsResponse.json();
    console.log('✅ Available campaigns:');
    campaignsData.data.forEach(campaign => {
      console.log(`  - ${campaign.campaignId}: ${campaign.name} (ID: ${campaign.id})`);
    });

    console.log('');
    console.log('🚀 Ready to test assignment once deployment completes!');
    console.log('   User: 119 (kennen_02@icloud.com)');
    console.log('   Agent ID: "119" (will be auto-created)');
    console.log('   Campaign: FOLLOW-UP-2025');
    console.log('');
    console.log('🔄 Next: Wait for Railway deployment, then test assignment');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAgentAndTestAssignment();