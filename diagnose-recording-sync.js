/**
 * Trigger Twilio recording sync and diagnose call records issues
 * Addresses: Why call recordings from Twilio aren't showing in Omnivox
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function main() {
  try {
    console.log('🔐 Step 1: Login as admin...');
    
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'Ken3477!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Admin login successful');
    
    console.log('\n📊 Step 2: Check current call records...');
    
    const recordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!recordsResponse.ok) {
      throw new Error(`Failed to fetch call records: ${recordsResponse.status} ${recordsResponse.statusText}`);
    }
    
    const recordsData = await recordsResponse.json();
    console.log(`📞 Current call records in Omnivox: ${recordsData.data?.records?.length || 0}`);
    console.log(`📄 Total records: ${recordsData.data?.total || 0}`);
    
    if (recordsData.data?.records?.length > 0) {
      console.log('🔍 Sample records:');
      recordsData.data.records.slice(0, 3).forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.phoneNumber} - ${record.outcome || 'No outcome'} - Recording: ${record.recording ? 'Yes' : 'No'}`);
      });
    }
    
    console.log('\n🔄 Step 3: Check recording sync status...');
    
    const syncStatusResponse = await fetch(`${API_BASE}/call-records/sync-status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (syncStatusResponse.ok) {
      const syncStatus = await syncStatusResponse.json();
      console.log('📊 Sync status:', syncStatus.data);
    } else {
      console.log('⚠️ Could not fetch sync status');
    }
    
    console.log('\n🎵 Step 4: Trigger recording sync from Twilio...');
    
    const syncResponse = await fetch(`${API_BASE}/call-records/sync-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!syncResponse.ok) {
      const syncError = await syncResponse.text();
      throw new Error(`Sync failed: ${syncResponse.status} ${syncResponse.statusText} - ${syncError}`);
    }
    
    const syncData = await syncResponse.json();
    console.log('✅ Recording sync result:', syncData);
    
    console.log('\n📊 Step 5: Check call records again after sync...');
    
    const recordsAfterSyncResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (recordsAfterSyncResponse.ok) {
      const recordsAfterSync = await recordsAfterSyncResponse.json();
      console.log(`📞 Call records after sync: ${recordsAfterSync.data?.records?.length || 0}`);
      console.log(`📄 Total records after sync: ${recordsAfterSync.data?.total || 0}`);
      
      if (recordsAfterSync.data?.records?.length > 0) {
        const recordsWithRecordings = recordsAfterSync.data.records.filter(r => r.recording);
        console.log(`🎵 Records with recordings: ${recordsWithRecordings.length}`);
      }
    }
    
    console.log('\n✅ Recording sync diagnosis complete');
    
  } catch (error) {
    console.error('❌ Error during recording sync diagnosis:', error.message);
    console.error('Full error:', error);
  }
}

main();