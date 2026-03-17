const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function debugLogin() {
  console.log('🔍 Debugging login issue...');
  
  const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://zenan:@localhost:5432/omnivox_dev'
  });

  try {
    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: 'admin@omnivox.ai' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    // 2. Test password validation
    const testPassword = 'admin123';
    const passwordMatch = await bcrypt.compare(testPassword, user.password);
    
    console.log('🔐 Password test:');
    console.log('  Test password:', testPassword);
    console.log('  Password matches:', passwordMatch);

    // 3. Check account status
    console.log('📊 Account status:');
    console.log('  Account locked:', !!user.accountLockedUntil);
    console.log('  Last login attempt:', user.lastLoginAttempt);
    console.log('  Failed attempts:', user.failedLoginAttempts || 0);

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugLogin();