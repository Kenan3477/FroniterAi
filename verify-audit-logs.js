// Final test to verify audit logs exist in Railway backend
const fetch = require('node-fetch');

async function verifyAuditLogsExist() {
  console.log('🔍 Final verification: Do audit logs actually exist in Railway backend?');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  const FRONTEND_URL = 'https://omnivox-ai.vercel.app';
  
  try {
    // Get token
    const loginResponse = await fetch(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.admin@omnivox.com',
        password: 'TestAdmin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Test 1: Get ALL audit logs (no filters)
    console.log('1️⃣ Getting ALL audit logs (no filters)...');
    const allAuditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?limit=50`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const allAuditData = await allAuditResponse.json();
    console.log('All audit logs count:', allAuditData.data?.logs?.length || 0);
    console.log('Total audit logs in DB:', allAuditData.data?.pagination?.total || 0);
    
    if (allAuditData.data?.logs?.length > 0) {
      console.log('✅ Audit logs DO exist in the database!');
      console.log('\nFirst few audit logs:');
      allAuditData.data.logs.slice(0, 5).forEach(log => {
        console.log(`  - ${log.action}: ${log.performedByUserName} at ${log.timestamp}`);
      });
      
      // Test 2: Filter just by action (no dates)
      console.log('\n2️⃣ Getting audit logs filtered by action only (no dates)...');
      const actionFilterResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const actionFilterData = await actionFilterResponse.json();
      console.log('Action-filtered audit logs count:', actionFilterData.data?.logs?.length || 0);
      
      if (actionFilterData.data?.logs?.length > 0) {
        console.log('✅ Login/logout audit logs exist!');
        console.log('\nLogin/logout audit logs:');
        actionFilterData.data.logs.slice(0, 5).forEach(log => {
          console.log(`  - ${log.action}: ${log.performedByUserName} at ${log.timestamp}`);
        });
        
        // Test 3: Test the exact query the frontend would make (no date filter)
        console.log('\n3️⃣ Testing exact frontend query (action filter + higher limit)...');
        const frontendQueryResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN,USER_LOGOUT&limit=1000`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const frontendQueryData = await frontendQueryResponse.json();
        console.log('Frontend query audit logs count:', frontendQueryData.data?.logs?.length || 0);
        
        if (frontendQueryData.data?.logs?.length > 0) {
          console.log('✅ The frontend query should work! There might be a deployment delay.');
          
          // Show the date range of available audit logs
          const timestamps = frontendQueryData.data.logs.map(log => new Date(log.timestamp));
          const minDate = new Date(Math.min(...timestamps));
          const maxDate = new Date(Math.max(...timestamps));
          
          console.log(`\n📅 Audit logs date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
          console.log(`📅 In local time: ${minDate.toLocaleString()} to ${maxDate.toLocaleString()}`);
          
          // Test client-side filtering
          const todayStart = new Date('2026-02-19');
          const todayEnd = new Date('2026-02-20T23:59:59.999Z');
          
          const filteredLogs = frontendQueryData.data.logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= todayStart && logDate <= todayEnd;
          });
          
          console.log(`\n🔍 Client-side filtered (Feb 19-20): ${filteredLogs.length} logs`);
          
          if (filteredLogs.length > 0) {
            console.log('✅ Client-side filtering works! The frontend fix should work once deployed.');
            console.log('\nFiltered logs sample:');
            filteredLogs.slice(0, 3).forEach(log => {
              console.log(`  - ${log.action}: ${log.performedByUserName} at ${log.timestamp}`);
            });
          }
        }
        
      } else {
        console.log('❌ No login/logout audit logs found');
      }
      
    } else {
      console.log('❌ No audit logs found in database');
    }
    
  } catch (error) {
    console.error('❌ Error verifying audit logs:', error);
  }
}

verifyAuditLogsExist();