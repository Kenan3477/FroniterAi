const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserEmail() {
  try {
    const user = await prisma.user.update({
      where: { email: 'ken@simpleemails.co.uk' },
      data: { email: 'Ken@simpleemails.co.uk' }
    });
    
    console.log('✅ Email updated successfully:', user.email);
    
  } catch (error) {
    console.error('❌ Error updating email:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserEmail();