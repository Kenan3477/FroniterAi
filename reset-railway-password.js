require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function resetRailwayPassword() {
  try {
    console.log('🔧 Resetting Railway password for admin@omnivox-ai.co.uk...');

    const email = 'admin@omnivox-ai.co.uk';
    const newPassword = 'SimpleAdmin123!';

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update existing admin account
    const admin = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        lastLoginAttempt: null,
        accountLockedUntil: null,
        failedLoginAttempts: 0
      }
    });

    console.log('✅ Railway password reset successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', newPassword);
    console.log('🆔 User ID:', admin.id);

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetRailwayPassword();