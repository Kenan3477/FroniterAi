const fetch = require('node-fetch');

console.log('🎯 Creating data list and contacts for DAC campaign...');

const testContacts = [
  {
    firstName: 'John',
    lastName: 'Smith', 
    phone: '+1234567890',
    email: 'john.smith@example.com',
    company: 'Tech Corp',
    jobTitle: 'Manager',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA'
  },
  {
    firstName: 'Jane',
    lastName: 'Johnson',
    phone: '+1234567891', 
    email: 'jane.johnson@example.com',
    company: 'Sales Inc',
    jobTitle: 'Director',
    address: '456 Oak Ave',
    city: 'Los Angeles', 
    state: 'CA',
    zipCode: '90210',
    country: 'USA'
  },
  {
    firstName: 'Mike',
    lastName: 'Williams',
    phone: '+1234567892',
    email: 'mike.williams@example.com',
    company: 'Business LLC',
    jobTitle: 'VP Sales', 
    address: '789 Pine Rd',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    country: 'USA'
  }
];

async function setupDACCampaignContacts() {
  try {
    // 1. Create a data list with contacts for DAC campaign
    console.log('📋 Creating data list with contacts for DAC campaign...');
    
    const dataListResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/data-lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'DAC Preview Test Contacts',
        description: 'Test contacts for DAC campaign preview dialing',
        campaignId: 'campaign_1766695393511',
        contacts: testContacts,
        active: true
      })
    });
    
    const dataListResult = await dataListResponse.json();
    console.log('📊 Data list creation response:', dataListResult);
    
    if (!dataListResult.success) {
      console.error('❌ Failed to create data list:', dataListResult.error);
      return;
    }
    
    console.log('✅ Created data list:', dataListResult.data.listId);
    
    // 2. Generate queue for the DAC campaign
    console.log('⚡ Generating queue for DAC campaign...');
    
    const queueResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/campaigns/cmjlwtm260006a49neir3ui93/generate-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxRecords: 10
      })
    });
    
    const queueResult = await queueResponse.json();
    console.log('📊 Queue generation response:', queueResult);
    
    if (queueResult.success) {
      console.log('✅ Successfully generated queue with', queueResult.data.generated, 'entries');
      console.log('🎯 DAC campaign is now ready for Preview Dialing!');
    } else {
      console.error('❌ Failed to generate queue:', queueResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error setting up DAC campaign contacts:', error.message);
  }
}

setupDACCampaignContacts();