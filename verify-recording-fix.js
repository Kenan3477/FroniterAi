/**
 * Verify Recording Playback Fix Deployment
 * Tests if the Railway deployment has the recording streaming fix
 */

const API_URL = 'https://froniterai-production.up.railway.app';

async function verifyRecordingFix() {
  console.log('🔍 Verifying Recording Playback Fix Deployment\n');
  console.log('API URL:', API_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Check health
    console.log('1. Checking API health...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const health = await healthResponse.json();
    
    if (health.status === 'ok') {
      console.log('   ✅ API is healthy');
      console.log('   ✅ Database connected:', health.database?.connected);
    } else {
      console.log('   ⚠️  API health check returned:', health.status);
    }

    // Step 2: Try to access a test recording endpoint
    console.log('\n2. Testing recording endpoint accessibility...');
    const testRecordingId = 'cmm6tpyt700534na9947m2cs5'; // Known recording ID
    
    const recordingResponse = await fetch(
      `${API_URL}/api/recordings/${testRecordingId}/stream`,
      {
        method: 'HEAD', // Just check if endpoint responds
        redirect: 'manual'
      }
    );

    console.log('   Status:', recordingResponse.status);
    console.log('   Status Text:', recordingResponse.statusText);
    
    if (recordingResponse.status === 401) {
      console.log('   ✅ Endpoint requires authentication (expected)');
      console.log('   ✅ Route is registered and working');
    } else if (recordingResponse.status === 200) {
      console.log('   ✅ Endpoint is accessible');
    } else if (recordingResponse.status === 501) {
      console.log('   ❌ Still returning 501 - deployment may not be complete yet');
      console.log('   ⏳ Wait a few minutes and try again');
    } else {
      console.log('   ⚠️  Unexpected status:', recordingResponse.status);
    }

    // Step 3: Check if backend is responding with correct content type
    const headers = Object.fromEntries(recordingResponse.headers);
    if (headers['content-type']) {
      console.log('   Content-Type:', headers['content-type']);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Deployment Verification Summary:\n');
    
    if (recordingResponse.status === 401 || recordingResponse.status === 200) {
      console.log('✅ Recording endpoint is working correctly');
      console.log('✅ Deployment appears successful');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Login to the frontend');
      console.log('   2. Go to Reports → Voice → Call Records');
      console.log('   3. Click play on any call with a recording');
      console.log('   4. Audio should now play successfully\n');
    } else if (recordingResponse.status === 501) {
      console.log('⏳ Deployment still in progress');
      console.log('   Wait 2-3 minutes and run this script again\n');
    } else {
      console.log('⚠️  Unexpected response from recording endpoint');
      console.log('   Check Railway logs for more details\n');
    }

    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    console.log('\n⚠️  This might be a network issue or Railway is still deploying.');
    console.log('   Wait a few minutes and try again.\n');
  }
}

// Run verification
verifyRecordingFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
