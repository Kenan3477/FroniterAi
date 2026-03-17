const fetch = require('node-fetch');

async function testInteractionHistoryAPI() {
  try {
    console.log('🔍 Testing Interaction History API...');
    
    // Test the API call directly
    const url = 'https://froniterai-production.up.railway.app/api/interaction-history/categorized?agentId=509&limit=20';
    console.log('📞 Calling:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('📝 Raw response:', data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('\n🎯 Parsed response:', JSON.stringify(jsonData, null, 2));
      
      if (jsonData.success) {
        console.log('\n📈 Results summary:');
        console.log(`- Queued: ${jsonData.data?.queued?.length || 0}`);
        console.log(`- Allocated: ${jsonData.data?.allocated?.length || 0}`);
        console.log(`- Outcomed: ${jsonData.data?.outcomed?.length || 0}`);
        console.log(`- Unallocated: ${jsonData.data?.unallocated?.length || 0}`);
        
        if (jsonData.data?.outcomed?.length > 0) {
          console.log('\n🎯 Sample outcomed interactions:');
          jsonData.data.outcomed.slice(0, 3).forEach((interaction, index) => {
            console.log(`${index + 1}. ${interaction.contactName} - ${interaction.outcome} (${interaction.dateTime})`);
          });
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testInteractionHistoryAPI();