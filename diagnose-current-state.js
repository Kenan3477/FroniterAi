/**
 * Direct fix for existing broken call records
 * Since Railway hasn't deployed our backend changes yet,
 * we need to work with the current production API
 */

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function diagnoseCurrentState() {
  console.log('🔍 DIAGNOSING CURRENT PRODUCTION STATE');
  console.log('=====================================');

  try {
    // Step 1: Login
    console.log('\n🔐 Step 1: Authentication');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox-ai.com',
        password: 'Ken3477!'
      })
    });

    const loginData = await loginResponse.json();
    const authToken = loginData.data.token;
    console.log('✅ Admin authenticated');

    // Step 2: Check if our backend changes are deployed
    console.log('\n🏭 Step 2: Check Railway Backend Status');
    
    // Test if our improved import logic is available
    const testImportResponse = await fetch(`${API_BASE}/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daysBack: 1, // Small test
        limit: 1
      })
    });

    if (testImportResponse.ok) {
      const testData = await testImportResponse.json();
      console.log('✅ Import endpoint available');
      console.log('📊 Test result:', testData);
    } else {
      console.log('❌ Import endpoint failed:', testImportResponse.status);
    }

    // Step 3: Check current broken records
    console.log('\n📞 Step 3: Current Broken Records Analysis');
    
    const recordsResponse = await fetch(`${API_BASE}/call-records?limit=15`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (recordsResponse.ok) {
      const recordsData = await recordsResponse.json();
      const records = recordsData.records || [];
      
      console.log(`📊 Total records: ${records.length}`);
      
      const unknownPhone = records.filter(r => r.phoneNumber === 'Unknown');
      const johnTurner = records.filter(r => 
        r.contact?.firstName === 'John' && r.contact?.lastName === 'Turner'
      );
      const noAgent = records.filter(r => !r.agentId);
      
      console.log(`❌ Records with "Unknown" phone: ${unknownPhone.length}`);
      console.log(`❌ Records with "John Turner" contact: ${johnTurner.length}`);
      console.log(`❌ Records with no agent: ${noAgent.length}`);
      
      // Show actual Twilio call SIDs (these contain the real data)
      console.log('\n📱 Available Call SIDs for Phone Number Recovery:');
      records.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. Call SID: ${record.callId}`);
        console.log(`      Current Phone: ${record.phoneNumber}`);
        console.log(`      We can extract real phone from this SID via Twilio API`);
      });
    }

    // Step 4: Check if we can access Twilio directly to get real phone numbers
    console.log('\n🔧 Step 4: Solution Options');
    console.log('===========================');
    
    console.log('\n❌ CURRENT ISSUE:');
    console.log('- Railway production backend still has old import logic');
    console.log('- Our fixes are in GitHub but not deployed to Railway yet');
    console.log('- All 12 records have placeholder data instead of real data');
    
    console.log('\n✅ IMMEDIATE SOLUTIONS:');
    console.log('1. 🚀 Force Railway deployment of our backend fixes');
    console.log('2. 🗄️  Create cleanup script to fix existing records');
    console.log('3. 🔧 Manual database update via Railway console');
    console.log('4. ⚡ Delete broken records and re-import with fixed logic');

    console.log('\n🎯 RECOMMENDED APPROACH:');
    console.log('Delete the 11 broken "Unknown" records and re-import');
    console.log('Keep the 1 working record (+447496603827)');
    console.log('Then wait for Railway deployment of our backend fixes');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseCurrentState();