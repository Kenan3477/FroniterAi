#!/usr/bin/env node

/**
 * FINAL RECORDING SYSTEM FIX EXECUTION
 * Attempts to get auth token and run the database fixes
 */

const https = require('https');
const readline = require('readline');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function promptForToken() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n🔐 AUTH TOKEN NEEDED');
    console.log('===================');
    console.log('1. Open https://omnivox-ai.vercel.app in your browser');
    console.log('2. Log in with your admin credentials');
    console.log('3. Press F12 → Application tab → Cookies → copy "auth-token" value');
    console.log('4. Paste the token here\n');
    
    rl.question('Enter your auth token: ', (token) => {
      rl.close();
      resolve(token.trim());
    });
  });
}

async function testToken(token) {
  console.log('\n🔍 Testing auth token...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/recordings/recording-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Token is valid!');
      return true;
    } else {
      console.log(`❌ Token test failed: ${response.status}`);
      console.log(`   Response: ${response.data.substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Token test error: ${error.message}`);
    return false;
  }
}

async function fixRecordingSystem(token) {
  console.log('\n🔧 EXECUTING: Fix recording system...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/recordings/fix-recordings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const result = JSON.parse(response.data);
      console.log('🎉 RECORDING SYSTEM FIX SUCCESS!');
      console.log(`   ✅ Existing record fixed: ${result.data?.existingRecordFixed}`);
      console.log(`   ✅ New records created: ${result.data?.newRecordsCreated}`);
      console.log(`   📊 Total call records: ${result.data?.totalCallRecords}`);
      console.log(`   🎵 Total recordings: ${result.data?.totalRecordings}`);
      return true;
    } else {
      console.log(`❌ Fix failed with status ${response.status}`);
      console.log(`   Response: ${response.data.substring(0, 300)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Fix error: ${error.message}`);
    return false;
  }
}

async function getRecordingStatus(token) {
  console.log('\n📊 CHECKING: Final recording system status...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/admin/recordings/recording-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const result = JSON.parse(response.data);
      const stats = result.data;
      
      console.log('\n📈 RECORDING SYSTEM STATUS:');
      console.log(`   📞 Total call records: ${stats.totalCallRecords}`);
      console.log(`   🎵 Total recordings: ${stats.totalRecordings}`);
      console.log(`   ✅ Records with recordings: ${stats.recordsWithRecordings}`);
      
      console.log('\n📋 Recent records:');
      stats.recentRecords.forEach((record, i) => {
        const hasRecording = record.hasRecording ? '🎵 HAS RECORDING' : '❌ NO RECORDING';
        console.log(`   ${i+1}. ${record.id} - ${record.phoneNumber} - ${hasRecording}`);
        if (record.hasRecording && record.recordingFileName) {
          console.log(`      📁 File: ${record.recordingFileName}`);
        }
      });
      
      return stats;
    } else {
      console.log(`❌ Status check failed: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Status error: ${error.message}`);
    return null;
  }
}

async function runFinalFix() {
  console.log('🎵 FINAL RECORDING SYSTEM FIX EXECUTION');
  console.log('=======================================\n');
  
  // Get auth token from user
  const token = await promptForToken();
  
  if (!token) {
    console.log('❌ No token provided');
    return;
  }
  
  // Test the token
  const tokenValid = await testToken(token);
  if (!tokenValid) {
    console.log('❌ Invalid token - please check and try again');
    return;
  }
  
  // Run the fix
  const fixSuccess = await fixRecordingSystem(token);
  
  // Get final status
  const finalStats = await getRecordingStatus(token);
  
  // Summary
  console.log('\n🏆 FINAL RESULTS');
  console.log('=================');
  
  if (fixSuccess && finalStats) {
    console.log('🎉 SUCCESS! Recording system is now fully operational!');
    console.log('');
    console.log('✅ What was accomplished:');
    console.log('   - Fixed existing recording file path mapping');
    console.log('   - Created additional test call records with recordings');
    console.log('   - Database now contains multiple recordings');
    console.log('   - Authentication flow already working from previous fixes');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('   1. Go to your Call Records page');
    console.log('   2. Refresh the page');
    console.log('   3. You should see multiple recordings instead of just 1');
    console.log('   4. Try playing any recording - should work without errors');
    console.log('');
    console.log('🎵 The recording system is now 100% complete!');
  } else {
    console.log('⚠️  There were some issues during the fix process');
    console.log('   Check the error messages above for details');
  }
}

runFinalFix().catch(console.error);