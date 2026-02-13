/**
 * Update DAC Campaign to MANUAL_PREVIEW mode via API
 */

const FRONTEND_URL = 'https://omnivox-ai.vercel.app';

async function updateDACCampaignDialMethod() {
  try {
    console.log('🔍 Step 1: Fetching available campaigns...');
    
    // First get campaigns to find DAC campaign ID
    const campaignsResponse = await fetch(`${FRONTEND_URL}/api/campaigns/user-campaigns`);
    
    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.status}`);
    }
    
    const campaignsData = await campaignsResponse.json();
    console.log('📊 Campaigns response:', campaignsData);
    
    if (!campaignsData.success || !campaignsData.data || campaignsData.data.length === 0) {
      throw new Error('No campaigns found');
    }
    
    // Find DAC campaign
    const dacCampaign = campaignsData.data.find(campaign => 
      campaign.name && campaign.name.toLowerCase().includes('dac')
    );
    
    if (!dacCampaign) {
      console.log('❌ DAC campaign not found. Available campaigns:');
      campaignsData.data.forEach(campaign => {
        console.log(`  - ${campaign.name} (ID: ${campaign.campaignId}) - ${campaign.dialMethod}`);
      });
      return;
    }
    
    console.log('🎯 Found DAC campaign:', {
      id: dacCampaign.campaignId,
      name: dacCampaign.name,
      currentDialMethod: dacCampaign.dialMethod
    });
    
    // Check if already MANUAL_PREVIEW
    if (dacCampaign.dialMethod === 'MANUAL_PREVIEW') {
      console.log('✅ DAC campaign is already set to MANUAL_PREVIEW mode!');
      return;
    }
    
    // Update dial method to MANUAL_PREVIEW
    console.log('🔄 Step 2: Updating dial method to MANUAL_PREVIEW...');
    const updateResponse = await fetch(`${FRONTEND_URL}/api/admin/campaign-management/campaigns/${dacCampaign.campaignId}/dial-method`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dialMethod: 'MANUAL_PREVIEW'
      }),
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update dial method: ${updateResponse.status} - ${errorText}`);
    }
    
    const updateData = await updateResponse.json();
    console.log('📊 Update response:', updateData);
    
    if (updateData.success) {
      console.log('✅ Successfully updated DAC campaign to MANUAL_PREVIEW mode!');
      console.log('🎯 Campaign should now trigger Preview Dialing when agent marks as available');
    } else {
      console.error('❌ Update failed:', updateData.error || updateData.message);
    }
    
  } catch (error) {
    console.error('❌ Error updating DAC campaign:', error.message);
  }
}

updateDACCampaignDialMethod();