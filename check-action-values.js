// Check actual action values in audit logs
const fetch = require('node-fetch');

async function checkActionValues() {
  console.log('🔍 Checking actual action values in audit logs...');
  
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
    
    // Get all audit logs to see actual action values
    console.log('Getting all audit logs to analyze action values...');
    const allAuditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?limit=50`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const allAuditData = await allAuditResponse.json();
    
    if (allAuditData.data?.logs?.length > 0) {
      console.log(`Found ${allAuditData.data.logs.length} audit logs`);
      
      // Extract unique action values
      const actionValues = [...new Set(allAuditData.data.logs.map(log => log.action))];
      console.log('\n📋 Unique action values in database:');
      actionValues.forEach(action => {
        console.log(`  - "${action}"`);
      });
      
      // Show sample logs with actions
      console.log('\n📋 Sample audit logs with their action values:');
      allAuditData.data.logs.slice(0, 10).forEach(log => {
        console.log(`  - Action: "${log.action}" | User: ${log.performedByUserName} | Time: ${log.timestamp}`);
      });
      
      // Test different action filters
      const loginActions = actionValues.filter(action => action.toLowerCase().includes('login'));
      const logoutActions = actionValues.filter(action => action.toLowerCase().includes('logout'));
      
      console.log('\n🔍 Login-related actions:', loginActions);
      console.log('🔍 Logout-related actions:', logoutActions);
      
      // Test with actual action values if they exist
      if (loginActions.length > 0) {
        console.log('\n📡 Testing with actual login action values...');
        const actualLoginFilter = loginActions.join(',');
        
        const actualFilterResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=${actualLoginFilter}&limit=20`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const actualFilterData = await actualFilterResponse.json();
        console.log(`Results with actual action filter: ${actualFilterData.data?.logs?.length || 0} logs`);
        
        if (actualFilterData.data?.logs?.length > 0) {
          console.log('✅ Found logs with actual action values!');
          actualFilterData.data.logs.slice(0, 3).forEach(log => {
            console.log(`  - ${log.action}: ${log.performedByUserName} at ${log.timestamp}`);
          });
        }
      }
      
    } else {
      console.log('❌ No audit logs found');
    }
    
  } catch (error) {
    console.error('❌ Error checking action values:', error);
  }
}

checkActionValues();