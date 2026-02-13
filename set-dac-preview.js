#!/usr/bin/env node

// Set DAC to MANUAL_PREVIEW for testing
const fetch = require('node-fetch');

async function setDACToPreview() {
  try {
    const BACKEND_URL = 'https://froniterai-production.up.railway.app';
    const campaignId = 'campaign_1766695393511';
    
    console.log('🔄 Setting DAC campaign to MANUAL_PREVIEW...');
    const updateResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignId}/dial-method`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialMethod: 'MANUAL_PREVIEW' }),
    });
    
    const updateData = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log('✅ Successfully updated DAC to MANUAL_PREVIEW');
      console.log('🎯 Preview Dialing should now work when agent status is Available');
    } else {
      console.log('❌ Failed to update DAC:', updateData);
    }
    
  } catch (error) {
    console.error('❌ Error setting DAC to preview:', error);
  }
}

setDACToPreview();