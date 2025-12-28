// Test the complete campaign assignment flow for Kennen_02
console.log('🔍 Testing complete campaign assignment flow for Kennen_02...');

async function testKennenAssignmentFlow() {
  try {
    // Step 1: Login as admin
    console.log('🔐 Step 1: Logging in as admin...');
    const adminLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'OmnivoxAdmin2025!'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    if (!adminLoginData.success) {
      console.error('❌ Admin login failed:', adminLoginData);
      return;
    }
    
    const adminToken = adminLoginData.data.token;
    console.log('✅ Admin login successful');
    
    // Step 2: Find Kennen_02 user
    console.log('🔍 Step 2: Finding Kennen_02 user...');
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (!usersResponse.ok) {
      console.error('❌ Failed to fetch users:', usersResponse.status);
      return;
    }
    
    const usersData = await usersResponse.json();
    console.log('Users response status:', usersResponse.status);
    console.log('Users response data:', usersData);
    const kennenUser = usersData.find(user => user.email === 'kennen_02@icloud.com');
    
    if (!kennenUser) {
      console.error('❌ Kennen_02 user not found. Available users:');
      console.log(usersData?.map(u => ({ id: u.id, email: u.email, name: u.name })));
      return;
    }
    
    console.log('✅ Found Kennen_02 user:', { id: kennenUser.id, name: kennenUser.name, email: kennenUser.email });
    
    // Step 3: Check current campaigns for Kennen_02
    console.log('📋 Step 3: Checking current campaigns for Kennen_02...');
    const currentCampaignsResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${kennenUser.id}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (!currentCampaignsResponse.ok) {
      console.error('❌ Failed to fetch current campaigns:', currentCampaignsResponse.status);
      return;
    }
    
    const currentCampaigns = await currentCampaignsResponse.json();
    console.log('Current assignments for Kennen_02:', currentCampaigns?.data?.assignments?.length || 0);
    if (currentCampaigns?.data?.assignments?.length > 0) {
      console.log('Existing campaigns:', currentCampaigns.data.assignments.map(a => ({ id: a.campaignId, name: a.name })));
    }
    
    // Step 4: Get available campaigns 
    console.log('🏢 Step 4: Getting available campaigns...');
    const availableCampaignsResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/campaigns');
    
    if (!availableCampaignsResponse.ok) {
      console.error('❌ Failed to fetch available campaigns:', availableCampaignsResponse.status);
      return;
    }
    
    const availableCampaigns = await availableCampaignsResponse.json();
    console.log('Available campaigns:', availableCampaigns?.data?.length || 0);
    
    // Find a campaign that's not already assigned
    const assignedCampaignIds = currentCampaigns?.data?.assignments?.map(a => a.campaignId) || [];
    const unassignedCampaign = availableCampaigns.data?.find(c => !assignedCampaignIds.includes(c.campaignId));
    
    if (!unassignedCampaign) {
      console.log('ℹ️  All campaigns already assigned - skipping assignment test');
      console.log('📋 Proceeding to test user login and my-campaigns...');
    } else {
      console.log('🎯 Campaign to assign:', { id: unassignedCampaign.campaignId, name: unassignedCampaign.name });
      
      // Step 5: Assign the campaign
      console.log('📝 Step 5: Assigning campaign to Kennen_02...');
      const assignResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${kennenUser.id}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          campaignId: unassignedCampaign.campaignId,
          assignedBy: 1
        })
      });
      
      const assignData = await assignResponse.json();
      console.log('Assignment result:', assignResponse.status, assignData);
      
      if (!assignResponse.ok) {
        console.error('❌ Assignment failed');
        return;
      }
      
      console.log('✅ Campaign assigned successfully');
      
      // Step 6: Verify assignment by checking campaigns again
      console.log('📋 Step 6: Verifying assignment...');
      const verifyResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${kennenUser.id}/campaigns`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      const verifyData = await verifyResponse.json();
      console.log('Campaigns after assignment:', verifyData?.data?.assignments?.length || 0);
      console.log('Updated assignments:', verifyData.data?.assignments?.map(a => ({ id: a.campaignId, name: a.name })));
    }
    
    // Step 7: Test user login and my-campaigns
    console.log('🔍 Step 7: Testing Kennen_02 login and my-campaigns...');
    const userLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'kennen_02@icloud.com',
        password: 'Kenzo3477!'
      })
    });
    
    const userLoginData = await userLoginResponse.json();
    console.log('User login result:', userLoginResponse.status, userLoginData.success ? 'SUCCESS' : userLoginData);
    
    if (!userLoginData.success) {
      console.error('❌ User login failed - this explains why user doesn\'t see campaigns');
      return;
    }
    
    const userToken = userLoginData.data.token;
    console.log('✅ User login successful');
    
    // Step 8: Test my-campaigns endpoint
    console.log('📋 Step 8: Testing my-campaigns endpoint...');
    const myCampaignsResponse = await fetch('https://froniterai-production.up.railway.app/api/users/my-campaigns', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const myCampaigns = await myCampaignsResponse.json();
    console.log('My campaigns result:', myCampaignsResponse.status, myCampaigns);
    console.log('My campaigns count:', myCampaigns?.data?.length || 0);
    
    if (myCampaigns?.data?.length > 0) {
      console.log('✅ User CAN see assigned campaigns:', myCampaigns.data.map(c => ({ id: c.campaignId, name: c.name })));
    } else {
      console.log('❌ User CANNOT see assigned campaigns - this is the bug!');
    }
    
    console.log('🏁 Test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testKennenAssignmentFlow();