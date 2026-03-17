const https = require('https');

// Try with updated admin credentials
const loginData = JSON.stringify({
  username: 'admin',
  password: 'Ken3477!'
});

const loginOptions = {
  hostname: 'froniterai-production.up.railway.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

console.log('🔑 Logging in with admin / Ken3477!...');

const loginReq = https.request(loginOptions, (res) => {
  console.log('Login status:', res.statusCode);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const loginResponse = JSON.parse(data);
      console.log('Login success:', loginResponse.success);
      
      if (loginResponse.success && loginResponse.token) {
        console.log('✅ Got fresh token! Testing call records...');
        
        // Test call records with fresh token
        const callRecordsOptions = {
          hostname: 'froniterai-production.up.railway.app',
          port: 443,
          path: '/api/call-records',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + loginResponse.token
          }
        };
        
        const callReq = https.request(callRecordsOptions, (callRes) => {
          console.log('\n📞 Call records status:', callRes.statusCode);
          
          let callData = '';
          callRes.on('data', chunk => callData += chunk);
          callRes.on('end', () => {
            if (callRes.statusCode === 200) {
              try {
                const parsed = JSON.parse(callData);
                console.log('\n✅ Call records API working!');
                console.log('- Success:', parsed.success);
                console.log('- Records count:', parsed.records ? parsed.records.length : 'No records property');
                
                if (parsed.records && parsed.records.length > 0) {
                  const firstRecord = parsed.records[0];
                  console.log('\n📞 ACTUAL DATA ANALYSIS:');
                  console.log('- Phone Number:', `'${firstRecord.phoneNumber}'` || 'MISSING');
                  console.log('- Agent ID:', `'${firstRecord.agentId}'` || 'MISSING');
                  console.log('- Agent Object:', firstRecord.agent ? 'Present' : 'NULL/MISSING');
                  if (firstRecord.agent) {
                    console.log(`  - Agent Name: '${firstRecord.agent.firstName} ${firstRecord.agent.lastName}'`);
                  }
                  console.log('- Contact Object:', firstRecord.contact ? 'Present' : 'NULL/MISSING');
                  if (firstRecord.contact) {
                    console.log(`  - Contact Name: '${firstRecord.contact.firstName} ${firstRecord.contact.lastName}'`);
                  }
                  console.log('- Campaign:', firstRecord.campaign ? firstRecord.campaign.name : 'NULL/MISSING');
                  
                  console.log('\n🔍 ROOT CAUSE ANALYSIS:');
                  if (firstRecord.phoneNumber === 'Unknown' || !firstRecord.phoneNumber) {
                    console.log('❌ ISSUE: Phone number is "Unknown" or missing');
                  }
                  if (!firstRecord.agent || firstRecord.agent.firstName === 'John') {
                    console.log('❌ ISSUE: Agent data is missing or shows fake "John Turner" data');
                  }
                  if (!firstRecord.contact || firstRecord.contact.firstName === 'John') {
                    console.log('❌ ISSUE: Contact data is missing or shows fake "John Turner" data');
                  }
                  
                } else {
                  console.log('\n📊 No call records found in database');
                }
              } catch (e) {
                console.log('Parse error:', e.message);
                console.log('Raw response:', callData.substring(0, 500));
              }
            } else {
              console.log('❌ Call records error:', callRes.statusCode);
              console.log('Response:', callData);
            }
          });
        });
        
        callReq.on('error', e => console.error('Call records error:', e.message));
        callReq.end();
        
      } else {
        console.log('❌ Login failed:', data);
      }
    } catch (e) {
      console.log('Login parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
});

loginReq.on('error', e => console.error('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();