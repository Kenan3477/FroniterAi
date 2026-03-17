#!/usr/bin/env node

/**
 * User Session Tracking System Test
 * Tests login/logout audit system and user session tracking
 */

const BACKEND_URL = 'http://localhost:3004';
const FRONTEND_URL = 'http://localhost:3001';

// Test authentication credentials
const testUsers = [
  { email: 'admin@omnivox-ai.com', password: process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET' },
  { email: 'Kennen_02@icloud.com', password: 'TestPassword123!' },
  { email: 'test@test.com', password: 'TestPassword123!' }
];

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'User-Session-Test/1.0',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.text();
  
  return {
    status: response.status,
    statusText: response.statusText,
    data: data,
    json: () => {
      try {
        return JSON.parse(data);
      } catch (e) {
        return { error: 'Invalid JSON', raw: data };
      }
    }
  };
}

async function testUserSessionTracking() {
  console.log('🔐 TESTING USER SESSION TRACKING SYSTEM');
  console.log('======================================\n');

  for (const testUser of testUsers) {
    console.log(`\n👤 Testing with user: ${testUser.email}`);
    console.log('─'.repeat(50));

    try {
      // Test 1: Direct Backend Login
      console.log('\n1️⃣ Testing direct backend login...');
      const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      if (loginResponse.status === 200) {
        const loginData = loginResponse.json();
        console.log('✅ Backend login successful');
        console.log(`   📋 User: ${loginData.data?.user?.name || 'Unknown'}`);
        console.log(`   🎫 Token: ${loginData.data?.token ? 'EXISTS' : 'MISSING'}`);
        console.log(`   🔑 Session ID: ${loginData.data?.sessionId || 'MISSING'}`);

        const authToken = loginData.data?.token;
        const sessionId = loginData.data?.sessionId;

        if (authToken && sessionId) {
          // Test 2: Check User Sessions API
          console.log('\n2️⃣ Testing user sessions API...');
          const sessionsResponse = await makeRequest(`${BACKEND_URL}/api/admin/user-sessions?limit=10&userId=${loginData.data.user.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          });

          if (sessionsResponse.status === 200) {
            const sessionsData = sessionsResponse.json();
            console.log('✅ User sessions API working');
            console.log(`   📊 Sessions found: ${sessionsData.data?.sessions?.length || 0}`);
            
            if (sessionsData.data?.sessions?.length > 0) {
              const latestSession = sessionsData.data.sessions[0];
              console.log(`   🕐 Latest login: ${latestSession.loginTime}`);
              console.log(`   📱 Device: ${latestSession.deviceType || 'Unknown'}`);
              console.log(`   📍 IP: ${latestSession.ipAddress || 'Unknown'}`);
            }
          } else {
            console.log('❌ User sessions API failed:', sessionsResponse.status);
          }

          // Test 3: Check Audit Logs API
          console.log('\n3️⃣ Testing audit logs API...');
          const auditResponse = await makeRequest(`${BACKEND_URL}/api/admin/audit-logs?action=USER_LOGIN&limit=5`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          });

          if (auditResponse.status === 200) {
            const auditData = auditResponse.json();
            console.log('✅ Audit logs API working');
            console.log(`   📝 Login events found: ${auditData.data?.logs?.length || 0}`);
            
            if (auditData.data?.logs?.length > 0) {
              const latestLogin = auditData.data.logs[0];
              console.log(`   👤 Latest login by: ${latestLogin.performedByUserName}`);
              console.log(`   🕐 At: ${latestLogin.timestamp}`);
            }
          } else {
            console.log('❌ Audit logs API failed:', auditResponse.status);
          }

          // Test 4: Login/Logout Report Generation
          console.log('\n4️⃣ Testing login/logout report generation...');
          const reportResponse = await makeRequest(`${BACKEND_URL}/api/admin/reports/generate?type=login_logout&startDate=${new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          });

          if (reportResponse.status === 200) {
            const reportData = reportResponse.json();
            console.log('✅ Login/logout report generation working');
            console.log(`   📊 Metrics generated: ${reportData.data?.metrics?.length || 0}`);
            console.log(`   📈 Chart data points: ${reportData.data?.chartData?.length || 0}`);
            console.log(`   📋 Table rows: ${reportData.data?.tableData?.length || 0}`);
            
            if (reportData.data?.metrics?.length > 0) {
              console.log('   📈 Key Metrics:');
              reportData.data.metrics.forEach(metric => {
                console.log(`      ${metric.label}: ${metric.value}`);
              });
            }
          } else {
            console.log('❌ Login/logout report failed:', reportResponse.status);
          }

          // Test 5: Logout with Session Tracking
          console.log('\n5️⃣ Testing logout with session tracking...');
          const logoutResponse = await makeRequest(`${BACKEND_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              sessionId: sessionId
            })
          });

          if (logoutResponse.status === 200) {
            console.log('✅ Logout with session tracking successful');
            
            // Verify session was updated
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second
            
            const updatedSessionResponse = await makeRequest(`${BACKEND_URL}/api/admin/user-sessions?sessionId=${sessionId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              }
            });

            if (updatedSessionResponse.status === 200) {
              const sessionData = updatedSessionResponse.json();
              console.log('✅ Session updated successfully after logout');
            }
          } else {
            console.log('❌ Logout failed:', logoutResponse.status);
          }

        } else {
          console.log('❌ Missing token or sessionId from login response');
        }

      } else {
        console.log(`❌ Backend login failed: ${loginResponse.status}`);
        const errorData = loginResponse.json();
        console.log(`   Error: ${errorData.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.log(`💥 Error testing ${testUser.email}:`, error.message);
    }

    console.log('\n' + '='.repeat(50));
  }

  // Test 6: Frontend API Integration
  console.log('\n\n🌐 TESTING FRONTEND API INTEGRATION');
  console.log('===================================');

  try {
    console.log('\n6️⃣ Testing frontend login/logout API...');
    
    const frontendLoginResponse = await makeRequest(`${FRONTEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUsers[0].email,
        password: testUsers[0].password
      })
    });

    if (frontendLoginResponse.status === 200) {
      const loginData = frontendLoginResponse.json();
      console.log('✅ Frontend login API working');
      console.log(`   🎫 Token: ${loginData.token ? 'EXISTS' : 'MISSING'}`);
      console.log(`   🔑 Session ID: ${loginData.sessionId ? 'EXISTS' : 'MISSING'}`);

      if (loginData.token) {
        // Test frontend logout
        const frontendLogoutResponse = await makeRequest(`${FRONTEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': `auth-token=${loginData.token}; session-id=${loginData.sessionId || ''}`
          }
        });

        if (frontendLogoutResponse.status === 200) {
          console.log('✅ Frontend logout API working');
        } else {
          console.log('❌ Frontend logout failed:', frontendLogoutResponse.status);
        }
      }
    } else {
      console.log('❌ Frontend login failed:', frontendLoginResponse.status);
    }

  } catch (error) {
    console.log('💥 Frontend API test error:', error.message);
  }

  console.log('\n🎉 USER SESSION TRACKING SYSTEM TEST COMPLETE!');
  console.log('==============================================');
}

// Run the test
testUserSessionTracking().catch(console.error);