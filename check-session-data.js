const { PrismaClient } = require('@prisma/client');

async function checkSessionData() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
  });

  try {
    // Check if UserSession table exists and has data
    console.log('📊 Checking UserSession table...');
    const sessionCount = await prisma.userSession.count();
    console.log(`📈 Total UserSessions in database: ${sessionCount}`);

    if (sessionCount > 0) {
      // Get recent sessions
      const recentSessions = await prisma.userSession.findMany({
        take: 5,
        orderBy: { loginTime: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      });

      console.log('🔍 Recent UserSessions:');
      recentSessions.forEach(session => {
        console.log(`  - User: ${session.user.username} (${session.user.email})`);
        console.log(`    Login: ${session.loginTime}`);
        console.log(`    Status: ${session.status}`);
        console.log(`    Session ID: ${session.sessionId}`);
        console.log(`    IP: ${session.ipAddress || 'N/A'}`);
        console.log('');
      });
    }

    // Also check audit logs for login/logout events
    console.log('📋 Checking audit logs for login/logout events...');
    const auditCount = await prisma.auditLog.count({
      where: {
        OR: [
          { action: { contains: 'LOGIN' } },
          { action: { contains: 'LOGOUT' } }
        ]
      }
    });
    console.log(`📈 Total Login/Logout audit entries: ${auditCount}`);

    if (auditCount > 0) {
      const recentAudits = await prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: 'LOGIN' } },
            { action: { contains: 'LOGOUT' } }
          ]
        },
        take: 5,
        orderBy: { timestamp: 'desc' }
      });

      console.log('🔍 Recent Login/Logout audit entries:');
      recentAudits.forEach(audit => {
        console.log(`  - Action: ${audit.action}`);
        console.log(`    User: ${audit.performedByUserName || 'Unknown'} (${audit.performedByUserEmail || 'N/A'})`);
        console.log(`    Time: ${audit.timestamp}`);
        console.log(`    Metadata: ${JSON.stringify(audit.metadata)}`);
        console.log('');
      });
    }

    // Also create a test user session for testing
    console.log('🧪 Creating a test user session for verification...');
    
    // First, find a test user
    const testUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'test' } },
          { email: { contains: 'test' } },
          { username: 'kenan' },
          { email: 'kenan@couk' }
        ]
      }
    });

    if (testUser) {
      console.log(`Found test user: ${testUser.username} (${testUser.email})`);
      
      // Create a test session
      const testSession = await prisma.userSession.create({
        data: {
          userId: testUser.id,
          sessionId: `test_sess_${Date.now()}`,
          loginTime: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Test Browser for Login/Logout Report',
          status: 'active'
        }
      });

      console.log(`✅ Test session created: ${testSession.sessionId}`);
    } else {
      console.log('⚠️ No test user found to create session');
    }

  } catch (error) {
    console.error('❌ Error checking session data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionData();