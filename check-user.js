const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'Ken@simpleemails.co.uk' }
    });
    
    if (!user) {
      console.log('❌ User not found with email: Ken@simpleemails.co.uk');
      
      // Check for case variations
      const allUsers = await prisma.user.findMany({
        select: { email: true, isActive: true, role: true }
      });
      console.log('📋 All users in database:', allUsers);
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
      console.log('🔐 Password test result:', isValid);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();