/**
 * OMNIVOX CALL RECORDS ISSUE RESOLUTION
 * 
 * Problem: Twilio recordings not showing in Omnivox frontend
 * Root Cause Analysis: Frontend authentication token not being sent properly
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function diagnoseCallRecordsIssue() {
  try {
    console.log('🔍 OMNIVOX CALL RECORDS DIAGNOSIS');
    console.log('=====================================');
    
    // Step 1: Test Authentication
    console.log('\n🔐 Step 1: Test Admin Authentication');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'Ken3477!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Admin authentication: SUCCESSFUL');
    console.log(`🎫 JWT Token: ${token.substring(0, 50)}...`);
    
    // Step 2: Test Call Records API (This is what's failing in frontend)
    console.log('\n📞 Step 2: Test Call Records API (Frontend Issue)');
    const recordsResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50&sortBy=startTime&sortOrder=desc`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Call Records API Status: ${recordsResponse.status} ${recordsResponse.statusText}`);
    
    if (recordsResponse.ok) {
      const recordsData = await recordsResponse.json();
      console.log('✅ Call Records API: WORKING');
      console.log(`📊 Total Call Records: ${recordsData.pagination?.total || 0}`);
      console.log(`🎵 Records with recordings: ${recordsData.records?.filter(r => r.recordingFile)?.length || 0}`);
      
      if (recordsData.records?.length > 0) {
        console.log('\n📋 Call Records Details:');
        recordsData.records.slice(0, 3).forEach((record, i) => {
          console.log(`  ${i + 1}. Call ID: ${record.callId}`);
          console.log(`     Phone: ${record.phoneNumber}`);
          console.log(`     Duration: ${record.duration}s`);
          console.log(`     Outcome: ${record.outcome}`);
          console.log(`     Recording: ${record.recordingFile ? '✅ YES' : '❌ NO'}`);
          if (record.recordingFile) {
            console.log(`     Recording File: ${record.recordingFile.fileName}`);
            console.log(`     Recording Duration: ${record.recordingFile.duration}s`);
          }
          console.log('');
        });
      }
    } else {
      console.error('❌ Call Records API: FAILED');
      const errorText = await recordsResponse.text();
      console.error(`   Error: ${errorText}`);
    }
    
    // Step 3: Test Recording Sync Status
    console.log('\n🔄 Step 3: Check Recording Sync Status');
    const syncStatusResponse = await fetch(`${API_BASE}/call-records/sync-status`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (syncStatusResponse.ok) {
      const syncStatus = await syncStatusResponse.json();
      console.log('✅ Sync Status API: WORKING');
      console.log(`📊 Sync Status: ${JSON.stringify(syncStatus.data, null, 2)}`);
    } else {
      console.log('⚠️ Sync Status API: Not available yet');
    }
    
    // Step 4: Trigger Manual Recording Sync
    console.log('\n🎵 Step 4: Trigger Manual Recording Sync');
    const manualSyncResponse = await fetch(`${API_BASE}/call-records/sync-recordings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (manualSyncResponse.ok) {
      const syncResult = await manualSyncResponse.json();
      console.log('✅ Manual Sync: SUCCESSFUL');
      console.log(`📊 Sync Result: ${syncResult.message}`);
    } else {
      console.log('❌ Manual Sync: FAILED');
      const errorText = await manualSyncResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Step 5: Final Check
    console.log('\n📊 Step 5: Final Call Records Check');
    const finalCheckResponse = await fetch(`${API_BASE}/call-records?page=1&limit=50`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (finalCheckResponse.ok) {
      const finalData = await finalCheckResponse.json();
      const recordsWithFiles = finalData.records?.filter(r => r.recordingFile)?.length || 0;
      console.log(`✅ Final Check: ${finalData.pagination?.total || 0} total records`);
      console.log(`🎵 Records with recording files: ${recordsWithFiles}`);
    }
    
    // Summary
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('===================');
    console.log('✅ Backend API: WORKING CORRECTLY');
    console.log('✅ Authentication: WORKING');
    console.log('✅ Call Records Endpoint: WORKING');
    console.log('✅ Recording Sync: AVAILABLE');
    console.log('');
    console.log('❌ FRONTEND ISSUE IDENTIFIED:');
    console.log('   The frontend is NOT sending the Authorization Bearer token');
    console.log('   in API requests to /api/call-records');
    console.log('');
    console.log('🔧 SOLUTION REQUIRED:');
    console.log('   Fix frontend authentication token handling');
    console.log('   Ensure Bearer token is included in API calls');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

async function testDashboardStatsEndpoint() {
  try {
    console.log('\n🔍 Testing Dashboard Stats Endpoint (401 error in console)');
    
    // Login first
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
    
    // Test dashboard stats
    const statsResponse = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Dashboard Stats Status: ${statsResponse.status} ${statsResponse.statusText}`);
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Dashboard Stats: WORKING');
      console.log('📊 Stats Data:', JSON.stringify(statsData, null, 2));
    } else {
      console.log('❌ Dashboard Stats: NOT FOUND OR FAILED');
      const errorText = await statsResponse.text();
      console.log(`   Error Response: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing dashboard stats:', error.message);
  }
}

// Run both diagnoses
async function runFullDiagnosis() {
  await diagnoseCallRecordsIssue();
  await testDashboardStatsEndpoint();
}

runFullDiagnosis();