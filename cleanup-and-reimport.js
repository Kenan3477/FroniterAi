/**
 * Create a cleanup endpoint request to delete broken records
 * and prepare for fresh import with correct data
 */

const API_BASE = 'https://froniterai-production.up.railway.app/api';

async function cleanupAndReimport() {
  console.log('🧹 CLEANUP AND RE-IMPORT BROKEN CALL RECORDS');
  console.log('=============================================');

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

    // Step 2: Get current state
    console.log('\n📊 Step 2: Current State Analysis');
    
    const recordsResponse = await fetch(`${API_BASE}/call-records`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    const recordsData = await recordsResponse.json();
    const allRecords = recordsData.records || [];
    const brokenRecords = allRecords.filter(r => r.phoneNumber === 'Unknown');
    const workingRecords = allRecords.filter(r => r.phoneNumber !== 'Unknown');
    
    console.log(`📞 Total records: ${allRecords.length}`);
    console.log(`❌ Broken records (Unknown phone): ${brokenRecords.length}`);
    console.log(`✅ Working records: ${workingRecords.length}`);
    
    if (workingRecords.length > 0) {
      console.log('\n✅ Working records:');
      workingRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.phoneNumber} (${new Date(record.startTime).toLocaleDateString()})`);
      });
    }

    // Step 3: Try to delete broken records one by one
    console.log('\n🗑️  Step 3: Delete Broken Records');
    
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const record of brokenRecords.slice(0, 5)) { // Test with first 5
      console.log(`\n🗑️  Attempting to delete record: ${record.callId}`);
      
      const deleteResponse = await fetch(`${API_BASE}/call-records/${record.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (deleteResponse.ok) {
        console.log(`   ✅ Deleted successfully`);
        deletedCount++;
      } else {
        console.log(`   ❌ Delete failed: ${deleteResponse.status}`);
        failedCount++;
      }
    }

    console.log(`\n📊 Deletion Results: ${deletedCount} deleted, ${failedCount} failed`);

    // Step 4: Test fresh import
    console.log('\n🔄 Step 4: Test Fresh Import');
    
    const importResponse = await fetch(`${API_BASE}/call-records/import-twilio-recordings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daysBack: 30,
        limit: 20
      })
    });

    if (importResponse.ok) {
      const importData = await importResponse.json();
      console.log('✅ Import completed:', {
        imported: importData.data?.imported || 0,
        skipped: importData.data?.skipped || 0,
        errors: importData.data?.errors || 0
      });
      
      if (importData.data?.imported > 0) {
        console.log('\n🎉 SUCCESS! New records imported with fixed logic');
      }
    } else {
      const errorText = await importResponse.text();
      console.log('❌ Import failed:', errorText);
    }

    // Step 5: Verify results
    console.log('\n🔍 Step 5: Verify Fixed Records');
    
    const verifyResponse = await fetch(`${API_BASE}/call-records?limit=15`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const newRecords = verifyData.records || [];
      const stillBroken = newRecords.filter(r => r.phoneNumber === 'Unknown');
      const fixed = newRecords.filter(r => r.phoneNumber !== 'Unknown' && r.phoneNumber !== '+447496603827');
      
      console.log(`\n📊 Final Results:`);
      console.log(`✅ Records with real phone numbers: ${fixed.length}`);
      console.log(`❌ Records still broken: ${stillBroken.length}`);
      
      if (fixed.length > 0) {
        console.log('\n🎉 FIXED RECORDS:');
        fixed.slice(0, 5).forEach((record, index) => {
          console.log(`   ${index + 1}. Phone: ${record.phoneNumber}`);
          console.log(`      Contact: ${record.contact?.firstName || 'Unknown'} ${record.contact?.lastName || ''}`);
          console.log(`      Agent: ${record.agentId || 'None'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanupAndReimport();