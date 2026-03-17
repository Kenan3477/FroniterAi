// Call the fix-dispositions endpoint
const callFixDispositions = async () => {
  console.log('🔧 Calling fix-dispositions endpoint...\n');
  
  try {
    const response = await fetch('https://froniterai-production.up.railway.app/api/calls/fix-dispositions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dummy-token` // Try with any token since it's a temp fix
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    const responseData = await response.json();
    console.log('\n📋 Response:');
    console.log(JSON.stringify(responseData, null, 2));
    
    if (responseData.success) {
      console.log('\n🎉 DISPOSITION LINKS CREATED!');
      console.log('📞 Manual calls should now save dispositions properly');
      
      if (responseData.data?.verification?.verified) {
        console.log('✅ Verified: Callback Requested is linked to manual-dial');
      }
    } else {
      console.log('\n❌ Fix failed:', responseData.message || responseData.error);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
};

callFixDispositions();