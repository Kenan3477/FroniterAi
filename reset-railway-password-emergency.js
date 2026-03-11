/**
 * Use Railway's emergency password reset endpoint to set a new password
 * This will hash the password ON Railway, ensuring it works with their environment
 */

const fetch = require('node-fetch');

const API_BASE = 'https://froniterai-production.up.railway.app';

async function resetPasswordOnRailway() {
  console.log('🔧 Resetting Password Using Railway Emergency Endpoint\n');

  const email = 'admin@omnivox.ai';
  const newPassword = 'RailwayAdmin123!';

  console.log(`📧 Target email: ${email}`);
  console.log(`🔑 New password: ${newPassword}\n`);

  try {
    console.log('📡 Calling Railway emergency password reset...');
    const response = await fetch(`${API_BASE}/api/emergency/reset-password/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPassword: newPassword
      })
    });

    console.log(`   Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();
    console.log('📄 Response:', JSON.stringify(data, null, 2));

    if (!response.ok || !data.success) {
      console.log('\n❌ Password reset failed');
      return null;
    }

    console.log('\n✅ Password reset successful on Railway!');
    console.log('   The password was hashed ON Railway, so it should work.\n');

    // Test login immediately
    console.log('🧪 Testing login with new password...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: newPassword
      })
    });

    console.log(`   Login Status: ${loginResponse.status} ${loginResponse.statusText}`);

    const loginData = await loginResponse.json();
    
    if (loginResponse.ok && loginData.success) {
      console.log('\n🎉 SUCCESS! Login working!');
      const token = loginData.data?.token || loginData.token;
      console.log(`🎫 Token (first 40 chars): ${token?.substring(0, 40)}...\n`);
      
      return { email, password: newPassword, token };
    } else {
      console.log('\n❌ Login still failed:');
      console.log('   ', JSON.stringify(loginData, null, 2));
      return null;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  const result = await resetPasswordOnRailway();
  
  if (!result) {
    console.log('\n💡 Try manually:');
    console.log(`   POST ${API_BASE}/api/emergency/reset-password/admin@omnivox.ai`);
    console.log(`   Body: { "newPassword": "YourPassword123!" }`);
    return;
  }

  // Now test the call records endpoint
  console.log('📡 Testing call records endpoint...\n');
  
  try {
    const callsResponse = await fetch(`${API_BASE}/api/call-records?limit=100`, {
      headers: {
        'Authorization': `Bearer ${result.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${callsResponse.status}`);

    if (!callsResponse.ok) {
      const errorText = await callsResponse.text();
      console.log(`   ❌ Error: ${errorText}`);
      return;
    }

    const callsData = await callsResponse.json();
    console.log(`   ✅ Total records in database: ${callsData.pagination?.total || 0}`);
    console.log(`   ✅ Records returned: ${callsData.records?.length || 0}\n`);

    // Analyze recordings
    const records = callsData.records || [];
    const withRecording = records.filter(r => r.recordingFile !== null);
    const withoutRecording = records.filter(r => r.recordingFile === null);

    console.log('📊 RECORDING STATUS:');
    console.log(`   ✅ With recordings: ${withRecording.length}`);
    console.log(`   ❌ Without recordings: ${withoutRecording.length}\n`);

    if (withoutRecording.length > 0) {
      console.log('⚠️  CALL RECORDS WITHOUT RECORDINGS:\n');
      withoutRecording.forEach((record, i) => {
        console.log(`${i + 1}. ${record.id}`);
        console.log(`   Call ID: ${record.callId}`);
        console.log(`   Phone: ${record.phoneNumber || 'N/A'}`);
        console.log(`   Outcome: ${record.outcome || 'N/A'}`);
        console.log(`   Duration: ${record.duration || 0}s`);
        console.log('');
      });
    } else {
      console.log('✅ All call records have recordings!');
    }

    // Save credentials for future use
    console.log('\n💾 SAVE THESE CREDENTIALS:');
    console.log(`   Email: ${result.email}`);
    console.log(`   Password: ${result.password}`);
    console.log('\nYou can now use these to access Railway API.');

  } catch (error) {
    console.error('❌ Error testing call records:', error.message);
  }
}

main().catch(console.error);
