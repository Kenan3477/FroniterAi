const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createTestUserAndSession() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔧 Creating test admin user with known credentials...');
    
    // First, let's see what users exist
    console.log('👥 Checking existing users...');
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true
      }
    });
    
    console.log('Existing users:');
    existingUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
    });
    
    // Check if test admin already exists
    const existingTestAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'test.admin@omnivox.ai' },
          { username: 'testadmin' }
        ]
      }
    });

    let testUser;
    if (existingTestAdmin) {
      console.log('✅ Test admin user already exists:', existingTestAdmin.email);
      
      // Update password to known value
      console.log('🔑 Updating password to known value...');
      const hashedPassword = await bcrypt.hash('TestAdmin123!', 10);
      
      testUser = await prisma.user.update({
        where: { id: existingTestAdmin.id },
        data: {
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Password updated for user:', testUser.email);
    } else {
      // Create test admin user with unique username
      const hashedPassword = await bcrypt.hash('TestAdmin123!', 10);
      const uniqueUsername = `testadmin_${Date.now()}`;
      
      testUser = await prisma.user.create({
        data: {
          username: uniqueUsername,
          firstName: 'Test',
          lastName: 'Admin',
          name: 'Test Admin',  // Add the required name field
          email: 'test.admin@omnivox.ai',
          password: hashedPassword,
          role: 'ADMIN',
          status: 'available'
        }
      });
      
      console.log('✅ Test admin user created:', testUser.email);
    }
    
    // Verify we have a valid testUser
    if (!testUser || !testUser.id) {
      console.error('❌ Failed to get valid test user');
      return;
    }
    
    console.log('👤 Using test user:', testUser.username, 'ID:', testUser.id);

    // Check if there are existing user sessions
    console.log('\n📊 Checking existing user sessions...');
    try {
      const sessionCount = await prisma.userSession.count();
      console.log(`Current session count: ${sessionCount}`);
    } catch (error) {
      console.log('❌ Error counting sessions:', error.message);
      console.log('⚠️ Continuing with session creation...');
    }

    // Create a few test sessions to populate the login/logout report
    console.log('\n🧪 Creating test user sessions...');
    
    const testSessions = [
      {
        userId: testUser.id,
        sessionId: `test_session_${Date.now()}_1`,
        loginTime: new Date('2026-02-18T09:00:00Z'),
        logoutTime: new Date('2026-02-18T17:30:00Z'),
        sessionDuration: Math.floor(8.5 * 60 * 60), // 8.5 hours in seconds
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        status: 'logged_out'
      },
      {
        userId: testUser.id,
        sessionId: `test_session_${Date.now()}_2`,
        loginTime: new Date('2026-02-19T08:30:00Z'),
        logoutTime: new Date('2026-02-19T16:45:00Z'),
        sessionDuration: Math.floor(8.25 * 60 * 60), // 8.25 hours in seconds
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Test Browser 2)',
        status: 'logged_out'
      },
      {
        userId: testUser.id,
        sessionId: `test_session_${Date.now()}_3`,
        loginTime: new Date('2026-02-19T20:00:00Z'),
        logoutTime: null,
        sessionDuration: null,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Active Session)',
        status: 'active'
      }
    ];

    for (const session of testSessions) {
      const createdSession = await prisma.userSession.create({
        data: session
      });
      console.log(`  ✅ Created session: ${createdSession.sessionId} (${createdSession.status})`);
    }

    // Create corresponding audit log entries
    console.log('\n📋 Creating test audit log entries...');
    
    const auditEntries = [
      {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id,
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: new Date('2026-02-18T09:00:00Z'),
        metadata: {
          sessionId: testSessions[0].sessionId,
          loginMethod: 'password',
          deviceType: 'desktop',
          userRole: 'ADMIN',
          browserInfo: 'Mozilla/5.0 (Test Browser)',
          ipAddress: '192.168.1.100'
        },
        severity: 'INFO'
      },
      {
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id,
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: new Date('2026-02-18T17:30:00Z'),
        metadata: {
          sessionId: testSessions[0].sessionId,
          logoutMethod: 'manual',
          sessionDuration: '8.5 hours'
        },
        severity: 'INFO'
      },
      {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id,
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: new Date('2026-02-19T08:30:00Z'),
        metadata: {
          sessionId: testSessions[1].sessionId,
          loginMethod: 'password',
          deviceType: 'desktop',
          userRole: 'ADMIN',
          browserInfo: 'Mozilla/5.0 (Test Browser 2)',
          ipAddress: '192.168.1.101'
        },
        severity: 'INFO'
      },
      {
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id,
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: new Date('2026-02-19T16:45:00Z'),
        metadata: {
          sessionId: testSessions[1].sessionId,
          logoutMethod: 'manual',
          sessionDuration: '8.25 hours'
        },
        severity: 'INFO'
      },
      {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id.toString(),
        performedByUserId: testUser.id,
        performedByUserName: `${testUser.firstName} ${testUser.lastName}`,
        performedByUserEmail: testUser.email,
        timestamp: new Date('2026-02-19T20:00:00Z'),
        metadata: {
          sessionId: testSessions[2].sessionId,
          loginMethod: 'password',
          deviceType: 'desktop',
          userRole: 'ADMIN',
          browserInfo: 'Mozilla/5.0 (Active Session)',
          ipAddress: '192.168.1.102'
        },
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
    console.log('\n📝 Test Credentials:');
    console.log('   Email: test.admin@omnivox.ai');
    console.log('   Password: TestAdmin123!');
    console.log('   Role: ADMIN');
    
    console.log('\n📊 Test Data Summary:');
    console.log(`   - Created ${testSessions.length} user sessions`);
    console.log(`   - Created ${auditEntries.length} audit log entries`);
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

createTestUserAndSession();