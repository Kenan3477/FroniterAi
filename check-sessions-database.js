// Check if user sessions exist in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:xqLrCjYVBhBPUTcZGRkCeYfhcbBzaHaQ@autorack.proxy.rlwy.net:46886/railway"
});

async function checkSessions() {
  try {
    console.log('🔍 Checking for user sessions...');
    
    const sessions = await prisma.userSession.findMany({
      take: 10,
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
    
    console.log(`📊 Found ${sessions.length} sessions`);
    
    if (sessions.length > 0) {
      console.log('Latest sessions:');
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. User: ${session.user.username} (${session.user.email})`);
        console.log(`   Login: ${session.loginTime}`);
        console.log(`   Logout: ${session.logoutTime || 'Still active'}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Duration: ${session.sessionDuration || 'N/A'} seconds`);
        console.log('---');
      });
    } else {
      console.log('❗ No user sessions found in database');
    }
    
    // Check for audit logs as well
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['USER_LOGIN', 'USER_LOGOUT']
        }
      },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`📋 Found ${auditLogs.length} login/logout audit logs`);
    
    if (auditLogs.length > 0) {
      console.log('Latest audit logs:');
      auditLogs.forEach((log, index) => {
        console.log(`${index + 1}. Action: ${log.action}`);
        console.log(`   User: ${log.performedByUserName} (${log.performedByUserEmail})`);
        console.log(`   Time: ${log.timestamp}`);
        console.log(`   IP: ${log.ipAddress}`);
        console.log('---');
      });
    } else {
      console.log('❗ No login/logout audit logs found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();