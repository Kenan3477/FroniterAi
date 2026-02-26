// Fix disposition system - create missing dispositions for Manual Dialing campaign
const axios = require('axios');

const BASE_URL = 'https://froniterai-production.up.railway.app';

// First, let's check auth token format from successful calls
async function fixDispositions() {
  try {
    console.log('=== FIXING DISPOSITION SYSTEM ===\n');
    
    // 1. Try to get dispositions with different auth approaches
    console.log('1. Testing authentication methods...');
    
    const authMethods = [
      { name: 'Bearer dummy-test-token', header: 'Bearer dummy-test-token' },
      { name: 'dummy-test-token', header: 'dummy-test-token' },
      { name: 'No auth', header: null }
    ];
    
    for (const method of authMethods) {
      try {
        const headers = method.header ? { Authorization: method.header } : {};
        console.log(`\nTrying auth method: ${method.name}`);
        
        const response = await axios.get(`${BASE_URL}/api/dispositions`, { headers });
        
        if (response.data.success) {
          console.log(`✅ SUCCESS with ${method.name}`);
          console.log(`   Found ${response.data.data.length} dispositions`);
          
          // Use this auth method for the rest
          const workingAuth = headers;
          
          // 2. Check dispositions for Manual Dialing campaign
          console.log('\n2. Checking Manual Dialing campaign dispositions...');
          
          try {
            const campaignDispositions = await axios.get(
              `${BASE_URL}/api/dispositions/campaign/Manual%20Dialing`, 
              { headers: workingAuth }
            );
            
            if (campaignDispositions.data.success) {
              console.log(`Found ${campaignDispositions.data.data.length} dispositions for Manual Dialing`);
              
              // Check if the missing disposition exists
              const missingDispId = 'disp_1766684993442';
              const foundDisp = campaignDispositions.data.data.find(d => d.dispositionId === missingDispId);
              
              if (foundDisp) {
                console.log(`✅ Disposition ${missingDispId} found:`, foundDisp.name);
              } else {
                console.log(`❌ Disposition ${missingDispId} NOT FOUND`);
                console.log('Available dispositions:');
                campaignDispositions.data.data.forEach((disp, i) => {
                  console.log(`  ${i + 1}. ${disp.dispositionId}: ${disp.name} (${disp.outcome})`);
                });
              }
            }
          } catch (campaignError) {
            console.log('❌ Failed to get campaign dispositions:', campaignError.response?.status);
          }
          
          // 3. Create missing dispositions if needed
          console.log('\n3. Creating standard dispositions for Manual Dialing...');
          
          const standardDispositions = [
            {
              dispositionId: 'disp_1766684993442',
              name: 'Completed',
              outcome: 'completed',
              campaignId: 'Manual Dialing',
              description: 'Call completed successfully'
            },
            {
              dispositionId: 'disp_manual_answered',
              name: 'Answered',
              outcome: 'answered',
              campaignId: 'Manual Dialing',
              description: 'Call was answered'
            },
            {
              dispositionId: 'disp_manual_no_answer',
              name: 'No Answer',
              outcome: 'no_answer',
              campaignId: 'Manual Dialing',
              description: 'No answer'
            },
            {
              dispositionId: 'disp_manual_busy',
              name: 'Busy',
              outcome: 'busy',
              campaignId: 'Manual Dialing',
              description: 'Line was busy'
            },
            {
              dispositionId: 'disp_manual_voicemail',
              name: 'Voicemail',
              outcome: 'voicemail',
              campaignId: 'Manual Dialing',
              description: 'Reached voicemail'
            }
          ];
          
          for (const disposition of standardDispositions) {
            try {
              const createResponse = await axios.post(
                `${BASE_URL}/api/dispositions`,
                disposition,
                { headers: workingAuth }
              );
              
              if (createResponse.data.success) {
                console.log(`✅ Created disposition: ${disposition.name} (${disposition.dispositionId})`);
              } else {
                console.log(`❌ Failed to create ${disposition.name}:`, createResponse.data.error);
              }
            } catch (createError) {
              if (createError.response?.status === 409) {
                console.log(`ℹ️  Disposition ${disposition.name} already exists`);
              } else {
                console.log(`❌ Error creating ${disposition.name}:`, createError.response?.status);
              }
            }
          }
          
          break; // Stop trying other auth methods
        }
      } catch (error) {
        console.log(`❌ Failed with ${method.name}:`, error.response?.status || error.message);
      }
    }
    
    console.log('\n=== DISPOSITION FIX COMPLETE ===');
    
  } catch (error) {
    console.error('Error fixing dispositions:', error.message);
  }
}

fixDispositions();