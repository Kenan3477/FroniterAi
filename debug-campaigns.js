// Debug campaign assignment data structures
console.log('🔍 Testing campaign assignment data structures...');

// Test user campaigns endpoint
fetch('http://localhost:3000/api/admin/users/119/campaigns', {
  credentials: 'include'
}).then(res => res.json()).then(data => {
  console.log('📋 User Campaigns Data:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.data?.assignments?.length > 0) {
    console.log('📋 First assignment structure:');
    console.log(JSON.stringify(data.data.assignments[0], null, 2));
  }
}).catch(err => console.error('❌ User campaigns error:', err));

// Test available campaigns endpoint  
fetch('http://localhost:3000/api/admin/campaign-management/campaigns', {
  credentials: 'include'
}).then(res => res.json()).then(data => {
  console.log('🏢 Available Campaigns Data:');
  console.log(`Found ${data.data?.length || 0} campaigns`);
  
  if (data.data?.length > 0) {
    console.log('🏢 First campaign structure:');
    console.log(JSON.stringify(data.data[0], null, 2));
  }
}).catch(err => console.error('❌ Available campaigns error:', err));
