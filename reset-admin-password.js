const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://zenan:@localhost:5432/omnivox_dev'
  });

  try {
    console.log('🔐 Resetting admin password...');
    
    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the admin user
    const updatedUser = await prisma.user.update({
      where: {
        email: 'admin@omnivox.ai'
      },
      data: {
        password: hashedPassword,
        lastLoginAttempt: null,
        accountLockedUntil: null
      }
    });
    
    console.log(`✅ Password reset successfully for: ${updatedUser.email}`);
    console.log(`📧 Email: admin@omnivox.ai`);
    console.log(`🔑 Password: ${newPassword}`);
    console.log('🎯 You can now login to localhost:3001');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();