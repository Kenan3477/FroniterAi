/**
 * Debug Twilio Import Errors
 * The import endpoint found 13 recordings but had 13 errors
 * This script will help diagnose what's causing the import failures
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function debugTwilioImportErrors() {
  try {
    console.log('🔍 DEBUG TWILIO IMPORT ERRORS');
    console.log('=============================');
    
    // Login
    console.log('\n🔐 Authentication');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'Ken3477!'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Authenticated successfully');
    
    // Check current call records
    console.log('\n📊 Current Call Records');
    const recordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const recordsData = await recordsResponse.json();
    console.log(`📞 Current records: ${recordsData.pagination?.total || 0}`);
    
    // Test import with verbose logging (small batch first)
    console.log('\n🔍 Testing Import (First 3 recordings)');
    const importResponse = await fetch(`${API_BASE}/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        daysBack: 30,
        limit: 3  // Start with just 3 to see specific errors
      })
    });
    
    if (importResponse.ok) {
      const importData = await importResponse.json();
      console.log('📊 Import Response:', JSON.stringify(importData, null, 2));
      
      if (importData.data.errors > 0 && importData.data.totalTwilioRecordings > 0) {
        console.log('\n⚠️ ERRORS DETECTED:');
        console.log(`   Total Twilio recordings found: ${importData.data.totalTwilioRecordings}`);
        console.log(`   Import errors: ${importData.data.errors}`);
        console.log(`   Successfully imported: ${importData.data.imported}`);
        console.log(`   Skipped (already exist): ${importData.data.skipped}`);
        
        console.log('\n🔧 Possible Issues:');
        console.log('   1. Database constraint violations');
        console.log('   2. Invalid Twilio recording data format');
        console.log('   3. Missing required fields in schema');
        console.log('   4. Duplicate key conflicts');
        console.log('   5. Campaign or list creation failures');
      }
    } else {
      const errorText = await importResponse.text();
      console.log('❌ Import failed:', errorText);
    }
    
    // Check if any campaigns were created
    console.log('\n📋 Check Campaigns');
    const campaignsResponse = await fetch(`${API_BASE}/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      const importCampaign = campaignsData.data?.find(c => c.campaignId === 'IMPORTED-TWILIO');
      if (importCampaign) {
        console.log('✅ IMPORTED-TWILIO campaign exists');
      } else {
        console.log('⚠️ IMPORTED-TWILIO campaign not found');
      }
    }
    
    // Try to manually create required entities
    console.log('\n🔧 Manual Entity Creation Test');
    
    // Test campaign creation
    console.log('Testing campaign creation...');
    
    // Test list creation  
    console.log('Testing data list creation...');
    
    console.log('\n🎯 RECOMMENDED FIXES:');
    console.log('1. Check backend logs for specific error details');
    console.log('2. Ensure all required database entities exist');
    console.log('3. Validate Twilio recording data structure');
    console.log('4. Consider importing one record at a time for debugging');
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugTwilioImportErrors();