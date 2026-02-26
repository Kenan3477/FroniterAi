// Test what dispositions the frontend actually receives and uses
const testFrontendDispositions = async () => {
  console.log('🔍 Testing frontend disposition loading process...\n');
  
  try {
    // Test what the frontend dispositions API returns
    console.log('📤 Testing frontend /api/dispositions endpoint...');
    const frontendResponse = await fetch('https://omnivox-ai.vercel.app/api/dispositions');
    
    console.log(`📊 Frontend Response Status: ${frontendResponse.status}`);
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log('\n📋 Frontend Dispositions Response:');
      console.log(JSON.stringify(frontendData, null, 2));
      
      if (frontendData.success && frontendData.dispositions) {
        // Simulate the frontend processing logic
        console.log('\n🔄 Processing like frontend DispositionCard...');
        const allDispositions = [
          ...(frontendData.dispositions.positive || []),
          ...(frontendData.dispositions.neutral || []),
          ...(frontendData.dispositions.negative || [])
        ];
        
        console.log(`📊 Total dispositions available: ${allDispositions.length}`);
        allDispositions.forEach((disp, index) => {
          console.log(`   ${index + 1}. ${disp.name} (ID: ${disp.id})`);
        });
        
        // Check if any use the problematic ID
        const problematicId = 'cmm3dgmwi0002bk8br3qsinpd';
        const hasProblematic = allDispositions.find(d => d.id === problematicId);
        
        if (hasProblematic) {
          console.log(`\n❌ FOUND PROBLEMATIC ID: ${problematicId}`);
          console.log('   This explains why the backend validation failed');
        } else {
          console.log(`\n✅ Problematic ID not found in current dispositions`);
          console.log('   Frontend should be using fallback IDs');
        }
        
        // Check if using fallback
        if (frontendData.fallback) {
          console.log('\n⚠️ Using FALLBACK dispositions (backend unavailable)');
        } else {
          console.log('\n✅ Using BACKEND dispositions');
        }
      }
    } else {
      console.log('❌ Frontend dispositions endpoint failed');
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
};

testFrontendDispositions();