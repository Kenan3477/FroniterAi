// SECURITY AUDIT: Check all users in the database
const securityAudit = async () => {
  console.log('🔒 SECURITY AUDIT: Investigating unauthorized user activity...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Step 1: Login with your actual credentials
    console.log('1️⃣ Attempting login with admin@omnivox.co.uk...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox.co.uk',
        password: 'admin123' // Try common password
      })
    });
    
    let token = null;
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      token = loginData.token || loginData.data?.token;
      console.log('✅ Login successful with admin@omnivox.co.uk');
    } else {
      console.log('❌ Login failed with admin@omnivox.co.uk');
      
      // Try the test admin credentials to investigate
      console.log('🔍 Testing with test admin credentials...');
      const testLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test.admin@omnivox.com',
          password: 'TestAdmin123!'
        })
      });
      
      if (testLoginResponse.ok) {
        const testLoginData = await testLoginResponse.json();
        token = testLoginData.token || testLoginData.data?.token;
        console.log('⚠️ WARNING: Test admin credentials work! This should not exist unless you created it.');
      }
    }
    
    if (!token) {
      console.log('❌ No valid authentication - cannot investigate further');
      return;
    }
    
    // Step 2: Fetch all users from the database
    console.log('\n2️⃣ FETCHING ALL USERS IN DATABASE...');
    const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      const users = usersData.data?.users || [];
      
      console.log(`📊 TOTAL USERS FOUND: ${users.length}`);
      console.log('\n👥 ALL USERS IN DATABASE:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role} - Status: ${user.status} - Created: ${user.createdAt?.substring(0, 10) || 'Unknown'}`);
      });
      
      // Check for suspicious users
      const testUsers = users.filter(u => 
        u.email.includes('test') || 
        u.username.includes('test') ||
        u.email === 'test.admin@omnivox.com'
      );
      
      if (testUsers.length > 0) {
        console.log('\n🚨 SUSPICIOUS TEST USERS FOUND:');
        testUsers.forEach(user => {
          console.log(`   - ${user.email} (${user.username}) - Created: ${user.createdAt}`);
        });
        console.log('\n⚠️ These users should be investigated or removed if unauthorized!');
      }
      
      // Check your legitimate user
      const yourUser = users.find(u => u.email === 'admin@omnivox.co.uk');
      if (yourUser) {
        console.log('\n✅ Found your legitimate user:');
        console.log(`   - ${yourUser.email} (${yourUser.username}) - Role: ${yourUser.role}`);
      } else {
        console.log('\n❌ Your user admin@omnivox.co.uk not found in database!');
      }
      
    } else {
      console.log('❌ Failed to fetch users list');
    }
    
    // Step 3: Check recent login activity
    console.log('\n3️⃣ CHECKING RECENT LOGIN ACTIVITY...');
    const auditResponse = await fetch(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN&limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      const logins = auditData.data?.logs || [];
      
      console.log('\n📋 RECENT LOGIN ACTIVITY:');
      logins.forEach((login, index) => {
        const timestamp = new Date(login.timestamp).toLocaleString();
        const ip = login.metadata?.ipAddress || 'Unknown IP';
        console.log(`${index + 1}. ${login.performedByUserEmail} at ${timestamp} from ${ip}`);
      });
      
      // Identify unauthorized logins
      const unauthorizedLogins = logins.filter(login => 
        login.performedByUserEmail !== 'admin@omnivox.co.uk'
      );
      
      if (unauthorizedLogins.length > 0) {
        console.log('\n🚨 UNAUTHORIZED LOGIN ACTIVITY DETECTED:');
        unauthorizedLogins.forEach(login => {
          const timestamp = new Date(login.timestamp).toLocaleString();
          const ip = login.metadata?.ipAddress || 'Unknown IP';
          console.log(`   ⚠️ ${login.performedByUserEmail} at ${timestamp} from ${ip}`);
        });
      }
      
    } else {
      console.log('❌ Failed to fetch audit logs');
    }
    
    // Step 4: Check session durations issue
    console.log('\n4️⃣ INVESTIGATING SESSION DURATION ISSUE...');
    const sessionsResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json();
      const sessions = sessionsData.data?.sessions || [];
      
      console.log('\n📊 RECENT SESSIONS ANALYSIS:');
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. User: ${session.user?.email || 'Unknown'}`);
        console.log(`    Login: ${session.loginTime}`);
        console.log(`    Logout: ${session.logoutTime || 'Still active'}`);
        console.log(`    Duration: ${session.sessionDuration || 'N/A'} seconds`);
        console.log(`    Status: ${session.status}`);
        console.log('');
      });
      
      // Check why durations are N/A
      const activeSessions = sessions.filter(s => s.status === 'active');
      const completedSessions = sessions.filter(s => s.status === 'logged_out');
      const sessionsWithDuration = sessions.filter(s => s.sessionDuration !== null);
      
      console.log(`📊 Session Statistics:`);
      console.log(`   - Active sessions: ${activeSessions.length} (expected to have N/A duration)`);
      console.log(`   - Completed sessions: ${completedSessions.length}`);
      console.log(`   - Sessions with duration: ${sessionsWithDuration.length}`);
      
      if (completedSessions.length > 0 && sessionsWithDuration.length === 0) {
        console.log('🚨 ISSUE: Completed sessions should have durations but none do!');
      }
    }
    
    console.log('\n🎯 SECURITY RECOMMENDATIONS:');
    console.log('1. 🔒 Change all admin passwords immediately');
    console.log('2. 🗑️ Remove any unauthorized test users from the database');
    console.log('3. 📊 Review and fix session duration tracking');
    console.log('4. 🔍 Audit all recent user activity');
    console.log('5. 🛡️ Enable proper authentication logging');
    
  } catch (error) {
    console.error('❌ Security audit failed:', error);
  }
};

if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

securityAudit();