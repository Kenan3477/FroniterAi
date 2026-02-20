const { PrismaClient } = require('@prisma/client');

async function checkPrismaModels() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔍 Checking available Prisma models...');
    
    // Try to access different models to see which ones work
    console.log('Testing User model...');
    try {
      const userCount = await prisma.user.count();
      console.log('✅ User model works, count:', userCount);
    } catch (error) {
      console.log('❌ User model error:', error.message);
    }

    console.log('Testing UserSession model...');
    try {
      const sessionCount = await prisma.userSession.count();
      console.log('✅ UserSession model works, count:', sessionCount);
    } catch (error) {
      console.log('❌ UserSession model error:', error.message);
    }

    console.log('Testing AuditLog model...');
    try {
      const auditCount = await prisma.auditLog.count();
      console.log('✅ AuditLog model works, count:', auditCount);
    } catch (error) {
      console.log('❌ AuditLog model error:', error.message);
    }

    // Check if there are any other session-related models
    console.log('Checking object properties...');
    const prismaKeys = Object.keys(prisma).filter(key => 
      key.toLowerCase().includes('session') || 
      key.toLowerCase().includes('audit') ||
      key.toLowerCase().includes('user')
    );
    console.log('Available session/audit/user related models:', prismaKeys);

  } catch (error) {
    console.error('❌ Error checking models:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrismaModels();