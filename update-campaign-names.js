// Update existing imported calls to use better campaign names
const updateExistingCampaigns = async () => {
  try {
    console.log('🔄 Updating existing campaigns...');
    
    // Get admin token
    const loginResponse = await fetch('https://froniterai-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Ken3477!' })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Failed to login');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    
    // Call backend endpoint to update campaigns
    const updateResponse = await fetch('https://froniterai-production.up.railway.app/api/call-records/update-campaign-names', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldCampaignId: 'IMPORTED-TWILIO',
        newCampaignId: 'HISTORICAL-CALLS',
        newCampaignName: 'Historical Calls'
      })
    });
    
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log('✅ Campaign names updated:', updateData);
    } else {
      // Campaign update endpoint might not exist yet, let's create a simple SQL update
      console.log('⚠️  Campaign update endpoint not available - will need manual database update');
    }
    
  } catch (error) {
    console.error('❌ Error updating campaigns:', error.message);
  }
};

updateExistingCampaigns();