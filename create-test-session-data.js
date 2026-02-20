const { PrismaClient } = require('@prisma/client');

async function createTestSessionDataWithSQL() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🧪 Creating test session data using raw SQL...');
    
    // Get the test admin user
    const testUser = await prisma.user.findFirst({
      where: { email: 'test.admin@omnivox.com' }
    });
    
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('👤 Using test user:', testUser.username, 'ID:', testUser.id);
    
    // Check current session count
    const currentSessions = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM user_sessions;
    `;
    console.log('📊 Current session count:', Number(currentSessions[0].count));
    
    // Create test sessions using raw SQL
    console.log('\n🔧 Creating test user sessions...');
    
    const testSessionsSQL = [
      {
        sessionId: `test_session_${Date.now()}_1`,
        userId: testUser.id,
        loginTime: '2026-02-18T09:00:00Z',
        logoutTime: '2026-02-18T17:30:00Z',
        sessionDuration: Math.floor(8.5 * 60 * 60), // 8.5 hours in seconds
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        status: 'logged_out'
      },
      {
        sessionId: `test_session_${Date.now()}_2`,
        userId: testUser.id,
        loginTime: '2026-02-19T08:30:00Z',
        logoutTime: '2026-02-19T16:45:00Z',
        sessionDuration: Math.floor(8.25 * 60 * 60), // 8.25 hours in seconds
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Test Browser 2)',
        status: 'logged_out'
      },
      {
        sessionId: `test_session_${Date.now()}_3`,
        userId: testUser.id,
        loginTime: '2026-02-19T20:00:00Z',
        logoutTime: null,
        sessionDuration: null,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Active Session)',
        status: 'active'
      }
    ];
    
    for (let i = 0; i < testSessionsSQL.length; i++) {
      const session = testSessionsSQL[i];
      
      // Insert with proper NULL handling for logoutTime
      let insertResult;
      if (session.logoutTime) {
        insertResult = await prisma.$executeRaw`
          INSERT INTO user_sessions (
            id, "sessionId", "userId", "loginTime", "logoutTime", 
            "ipAddress", "userAgent", status, "sessionDuration", 
            "createdAt", "updatedAt", "lastActivity"
          ) VALUES (
            gen_random_uuid(), 
            ${session.sessionId}, 
            ${session.userId}, 
            ${session.loginTime}::timestamp, 
            ${session.logoutTime}::timestamp, 
            ${session.ipAddress}, 
            ${session.userAgent}, 
            ${session.status}, 
            ${session.sessionDuration}, 
            NOW(), 
            NOW(), 
            ${session.loginTime}::timestamp
          )
        `;
      } else {
        insertResult = await prisma.$executeRaw`
          INSERT INTO user_sessions (
            id, "sessionId", "userId", "loginTime", "logoutTime", 
            "ipAddress", "userAgent", status, "sessionDuration", 
            "createdAt", "updatedAt", "lastActivity"
          ) VALUES (
            gen_random_uuid(), 
            ${session.sessionId}, 
            ${session.userId}, 
            ${session.loginTime}::timestamp, 
            NULL, 
            ${session.ipAddress}, 
            ${session.userAgent}, 
            ${session.status}, 
            ${session.sessionDuration}, 
            NOW(), 
            NOW(), 
            ${session.loginTime}::timestamp
          )
        `;
      }
      
      console.log(`  ✅ Created session: ${session.sessionId} (${session.status})`);
    }
    
    // Create corresponding audit log entries
    console.log('\n📋 Creating test audit log entries...');
    
    const auditEntries = [
      {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id.toString(),
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: '2026-02-18T09:00:00Z',
        metadata: JSON.stringify({
          sessionId: testSessionsSQL[0].sessionId,
          loginMethod: 'password',
          deviceType: 'desktop',
          userRole: 'ADMIN',
          browserInfo: 'Mozilla/5.0 (Test Browser)',
          ipAddress: '192.168.1.100'
        }),
        severity: 'INFO'
      },
      {
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id.toString(),
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: '2026-02-18T17:30:00Z',
        metadata: JSON.stringify({
          sessionId: testSessionsSQL[0].sessionId,
          logoutMethod: 'manual',
          sessionDuration: '8.5 hours'
        }),
        severity: 'INFO'
      },
      {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id.toString(),
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: '2026-02-19T08:30:00Z',
        metadata: JSON.stringify({
          sessionId: testSessionsSQL[1].sessionId,
          loginMethod: 'password',
          deviceType: 'desktop',
          userRole: 'ADMIN',
          browserInfo: 'Mozilla/5.0 (Test Browser 2)',
          ipAddress: '192.168.1.101'
        }),
        severity: 'INFO'
      },
      {
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id.toString(),
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: '2026-02-19T16:45:00Z',
        metadata: JSON.stringify({
          sessionId: testSessionsSQL[1].sessionId,
          logoutMethod: 'manual',
          sessionDuration: '8.25 hours'
        }),
        severity: 'INFO'
      },
      {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id.toString(),
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: '2026-02-19T20:00:00Z',
        metadata: JSON.stringify({
          sessionId: testSessionsSQL[2].sessionId,
          loginMethod: 'password',
          deviceType: 'desktop',
          userRole: 'ADMIN',
          browserInfo: 'Mozilla/5.0 (Active Session)',
          ipAddress: '192.168.1.102'
        }),
        severity: 'INFO'
      }
    ];

    for (const auditEntry of auditEntries) {
      const createdAudit = await prisma.auditLog.create({
        data: auditEntry
      });
      console.log(`  ✅ Created audit log: ${createdAudit.action} at ${createdAudit.timestamp}`);
    }

    console.log('\n✅ Test data created successfully!');
    
    // Verify the data was created
    const newSessionCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM user_sessions WHERE "userId" = ${testUser.id};
    `;
    console.log(`📊 New sessions for test user: ${Number(newSessionCount[0].count)}`);

    console.log('\n📝 Test Credentials:');
    console.log('   Email: test.admin@omnivox.com');
    console.log('   Password: TestAdmin123!');
    console.log('   Role: ADMIN');
    
    console.log('\n📊 Test Data Summary:');
    console.log(`   - Created 3 user sessions for test user`);
    console.log(`   - Created 5 audit log entries`);
    console.log('   - Date range: 2026-02-18 to 2026-02-19');
    console.log('   - Includes active and completed sessions');

    console.log('\n🔍 You can now:');
    console.log('   1. Login with the test admin credentials');
    console.log('   2. Navigate to Reports > Users > Login/Logout');
    console.log('   3. View the login/logout audit trail data');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSessionDataWithSQL();