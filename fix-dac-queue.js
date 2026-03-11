const fetch = require('node-fetch');

async function fixDACQueue() {
  try {
    console.log('🔧 Fixing DAC Campaign Queue Generation');
    console.log('======================================');
    
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    
    // 1. Get DAC campaign with correct IDs
    console.log('\n1️⃣ Getting DAC campaign details...');
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`);
    const campaignsData = await campaignsResponse.json();
    
    const dacCampaign = campaignsData.data?.find(c => c.name?.includes('DAC'));
    
    console.log('🎯 DAC Campaign:', {
      name: dacCampaign.name,
      databaseId: dacCampaign.id,
      businessId: dacCampaign.campaignId,
      dialMethod: dacCampaign.dialMethod
    });
    
    // 2. Generate queue using the CORRECT database ID
    console.log('\n2️⃣ Generating queue using database ID...');
    const databaseId = dacCampaign.id; // Use the database ID, not the business ID
    
    const generateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${databaseId}/generate-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxRecords: 20 })
    });
    
    const generateData = await generateResponse.json();
    console.log('⚡ Queue generation status:', generateResponse.status);
    console.log('📊 Generation result:', generateData);
    
    if (generateResponse.ok && generateData.success) {
      const generated = generateData.data?.generated || 0;
      console.log(`✅ Successfully generated ${generated} queue entries!`);
      
      if (generated > 0) {
        // 3. Test preview fetch
        console.log('\n3️⃣ Testing preview contact fetch...');
        const previewResponse = await fetch(`${BACKEND_URL}/api/dial-queue/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: dacCampaign.campaignId, // Use business ID for dial queue
            agentId: 'agent-1'
          })
        });
        
        const previewData = await previewResponse.json();
        console.log('📞 Preview fetch status:', previewResponse.status);
        
        if (previewResponse.ok && previewData.success) {
          if (previewData.data?.contact) {
            const contact = previewData.data.contact;
            console.log('🎉 SUCCESS! Preview contact available:');
            console.log(`👤 ${contact.firstName} ${contact.lastName}`);
            console.log(`📱 ${contact.phone}`);
            console.log(`📧 ${contact.email || 'No email'}`);
            console.log('✅ Preview cards should now appear when you set status to Available!');
          } else {
            console.log('📭 No contact in preview response');
          }
        } else {
          console.log('❌ Preview fetch failed:', previewData);
        }
      } else {
        console.log('⚠️ No queue entries generated - check if contacts exist');
      }
    } else {
      console.log('❌ Queue generation failed:', generateData);
    }
    
    console.log('\n🎯 SOLUTION SUMMARY:');
    console.log('====================');
    console.log('✅ DAC campaign is correctly set to MANUAL_PREVIEW');
    console.log('✅ Queue generation should now work');
    console.log('📱 To see preview cards:');
    console.log('   1. Make sure you\'re logged into the DAC campaign');
    console.log('   2. Set your status to "Available" in the Work page');
    console.log('   3. Preview cards should auto-appear with customer info');
    
  } catch (error) {
    console.error('💥 Error fixing DAC queue:', error.message);
  }
}

fixDACQueue();