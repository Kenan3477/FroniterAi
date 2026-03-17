// Check session data for the current date range
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:xqLrCjYVBhBPUTcZGRkCeYfhcbBzaHaQ@autorack.proxy.rlwy.net:46886/railway"
});

async function checkSessionsInDateRange() {
  try {
    const startDate = new Date('2026-02-12'); // Start of range from the UI
    const endDate = new Date('2026-02-19');   // End of range from the UI
    endDate.setHours(23, 59, 59, 999); // End of day
    
    console.log('🔍 Checking sessions in date range:');
    console.log('  Start:', startDate.toISOString());
    console.log('  End:', endDate.toISOString());
    
    // Check UserSession records
    const sessions = await prisma.userSession.findMany({
      where: {
        loginTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: { loginTime: 'desc' }
    });
    
    console.log(`📊 Found ${sessions.length} sessions in date range`);
    
    if (sessions.length > 0) {
      console.log('Session details:');
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. User: ${session.user.username}`);
        console.log(`   Login: ${session.loginTime}`);
        console.log(`   Logout: ${session.logoutTime || 'Still active'}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Duration: ${session.sessionDuration || 'N/A'} seconds`);
        console.log('---');
      });
    }
    
    // Check AuditLog records
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        },
        action: {
          in: ['USER_LOGIN', 'USER_LOGOUT']
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`📋 Found ${auditLogs.length} audit logs in date range`);
    
    if (auditLogs.length > 0) {
      console.log('Audit log details:');
      auditLogs.forEach((log, index) => {
        console.log(`${index + 1}. Action: ${log.action}`);
        console.log(`   User: ${log.performedByUserName} (${log.performedByUserEmail})`);
        console.log(`   Time: ${log.timestamp}`);
        console.log(`   IP: ${log.ipAddress}`);
        console.log('---');
      });
    }
    
    if (sessions.length === 0 && auditLogs.length === 0) {
      console.log('❗ No session data found in the specified date range');
      console.log('💡 This explains why the report shows all zeros');
      
      // Check what data exists outside this range
      const allSessions = await prisma.userSession.findMany({
        take: 5,
        orderBy: { loginTime: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              email: true
            }
          }
        }
      });
      
      console.log(`\\n📊 Latest sessions (any date): ${allSessions.length}`);
      allSessions.forEach((session, index) => {
        console.log(`${index + 1}. User: ${session.user.username}`);
        console.log(`   Login: ${session.loginTime}`);
        console.log(`   Status: ${session.status}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionsInDateRange();