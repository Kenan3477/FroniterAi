// Test campaign assignments directly
console.log('🔍 Testing campaign assignment persistence...');

// Test the assignment endpoint directly
async function testAssignment() {
  try {
    // First login as admin to get a token
    console.log('🔐 Logging in as admin...');
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'admin'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Admin login successful');
    
    // Find a test user - let's check user list first
    console.log('👥 Fetching users...');
    const usersResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const usersData = await usersResponse.json();
    console.log('Users found:', usersData?.data?.length || 0);
    
    // Find a non-admin user
    const testUser = usersData.data?.find(user => user.role !== 'ADMIN' && user.isActive);
    if (!testUser) {
      console.error('❌ No test user found');
      return;
    }
    
    console.log('🎯 Test user:', testUser.name, 'ID:', testUser.id);
    
    // Check their current campaigns
    console.log('📋 Checking current campaigns...');
    const currentCampaignsResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${testUser.id}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const currentCampaigns = await currentCampaignsResponse.json();
    console.log('Current assignments:', currentCampaigns?.data?.assignments?.length || 0);
    if (currentCampaigns?.data?.assignments?.length > 0) {
      console.log('Existing assignments:', currentCampaigns.data.assignments.map(a => a.campaignId));
    }
    
    // Assign a new campaign
    const campaignToAssign = 'SURVEY-2025'; // Known campaign ID
    console.log(`📝 Assigning campaign ${campaignToAssign} to user ${testUser.id}...`);
    
    const assignResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${testUser.id}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        campaignId: campaignToAssign,
        assignedBy: 1
      })
    });
    
    const assignData = await assignResponse.json();
    console.log('Assignment result:', assignResponse.status, assignData);
    
    // Check campaigns again
    console.log('📋 Checking campaigns after assignment...');
    const newCampaignsResponse = await fetch(`https://froniterai-production.up.railway.app/api/admin/users/${testUser.id}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const newCampaigns = await newCampaignsResponse.json();
    console.log('Campaigns after assignment:', newCampaigns?.data?.assignments?.length || 0);
    if (newCampaigns?.data?.assignments?.length > 0) {
      console.log('Current assignments:', newCampaigns.data.assignments.map(a => a.campaignId));
    }
    
    // Now test the user's own my-campaigns endpoint
    console.log('🔍 Testing user login and my-campaigns...');
    const userLoginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: 'password123' // Default password
      })
    });
    
    const userLoginData = await userLoginResponse.json();
    if (userLoginData.success) {
      const userToken = userLoginData.data.token;
      console.log('✅ User login successful');
      
      const myCampaignsResponse = await fetch('https://froniterai-production.up.railway.app/api/users/my-campaigns', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      const myCampaigns = await myCampaignsResponse.json();
      console.log('My campaigns result:', myCampaignsResponse.status, myCampaigns);
      console.log('My campaigns count:', myCampaigns?.data?.length || 0);
    } else {
      console.log('❌ User login failed:', userLoginData);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAssignment();