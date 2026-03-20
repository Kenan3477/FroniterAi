const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    // Try lowercase version
    const user = await prisma.user.findUnique({
      where: { email: 'ken@simpleemails.co.uk' }
    });
    
    if (!user) {
      console.log('❌ User not found with email: ken@simpleemails.co.uk');
      return;
    }
    
    console.log('✅ User found:', {
      email: user.email,
      isActive: user.isActive,
      role: user.role,
      hasPassword: !!user.password
    });
    
    // Test password
    if (user.password) {
      const isValid = await bcrypt.compare('Kenzo3477!', user.password);
      console.log('🔐 Password "Kenzo3477!" test result:', isValid);
      
      // Also test the admin password from env
      const isAdminPassword = await bcrypt.compare('SecureAdmin2025!@#$%^', user.password);
      console.log('🔐 Admin password test result:', isAdminPassword);
    } else {
      console.log('❌ No password set for user');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();