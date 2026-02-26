// Get current dispositions from the API to see what actually exists
const getCurrentDispositions = async () => {
  console.log('🔍 Fetching current dispositions from database...\n');
  
  try {
    // First try the main dispositions endpoint
    console.log('📤 Fetching from /api/dispositions...');
    const response = await fetch('https://froniterai-production.up.railway.app/api/dispositions');
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (!response.ok) {
      console.log('❌ Main endpoint failed, trying configs...');
      
      // Try the configs endpoint
      const configResponse = await fetch('https://froniterai-production.up.railway.app/api/dispositions/configs');
      console.log(`📊 Config Response Status: ${configResponse.status}`);
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        console.log('\n📋 Dispositions from configs endpoint:');
        console.log(JSON.stringify(configData, null, 2));
        
        if (Array.isArray(configData)) {
          console.log(`\n📊 Found ${configData.length} dispositions:`);
          configData.forEach((disp, index) => {
            console.log(`   ${index + 1}. ${disp.name} (${disp.id})`);
          });
          
          // Check if our target disposition exists
          const targetExists = configData.find(d => d.id === 'cmm3dgmwi0002bk8br3qsinpd');
          if (targetExists) {
            console.log('\n✅ Target disposition FOUND: Callback Requested');
          } else {
            console.log('\n❌ Target disposition NOT FOUND: cmm3dgmwi0002bk8br3qsinpd');
            console.log('   Available disposition IDs:');
            configData.forEach(d => console.log(`      ${d.id}`));
          }
        }
      } else {
        console.log('❌ Both endpoints failed');
      }
      
    } else {
      const data = await response.json();
      console.log('\n📋 Dispositions from main endpoint:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
};

getCurrentDispositions();