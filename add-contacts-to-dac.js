const fetch = require('node-fetch');

console.log('🎯 Adding test contacts to DAC campaign...');

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

async function addContactsToCampaign() {
  try {
    // First create a data list
    console.log('📋 Creating data list for DAC campaign...');
    
    const listResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'DAC Test Contacts',
        description: 'Test contacts for DAC campaign preview dialing',
        campaignId: 'campaign_1766695393511',
        contacts: testContacts
      })
    });
    
    const listData = await listResponse.json();
    console.log('📊 List creation response:', listData);
    
    if (listData.success) {
      console.log('✅ Successfully created data list with', testContacts.length, 'contacts');
      console.log('📝 List ID:', listData.data?.id);
      
      // Assign the list to the campaign
      console.log('🔗 Assigning list to DAC campaign...');
      
      const assignResponse = await fetch('https://froniterai-production.up.railway.app/api/admin/campaign-management/campaigns/campaign_1766695393511/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listId: listData.data.id
        })
      });
      
      const assignData = await assignResponse.json();
      console.log('🔗 List assignment response:', assignData);
      
      if (assignData.success) {
        console.log('✅ Successfully assigned list to DAC campaign');
        console.log('🎯 DAC campaign now has contacts for Preview Dialing!');
      } else {
        console.error('❌ Failed to assign list to campaign:', assignData.error);
      }
    } else {
      console.error('❌ Failed to create data list:', listData.error);
    }
    
  } catch (error) {
    console.error('❌ Error adding contacts:', error.message);
  }
}

addContactsToCampaign();