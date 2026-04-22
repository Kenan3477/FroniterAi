const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:xHXEFkqrKdZMdnbwaNmGUoHQoqqEXXLj@interchange.proxy.rlwy.net:42798/railway'
    }
  }
});

async function checkKenanRole() {
  try {
    console.log('🔍 Checking Kenan\'s user role...\n');
    
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'kenan', mode: 'insensitive' } },
          { username: { contains: 'kenan', mode: 'insensitive' } },
          { email: { contains: 'ken', mode: 'insensitive' } },
          { id: 509 }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (user) {
      console.log('👤 User Found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}\n`);
      
      console.log('🔐 Admin Access Check:');
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        console.log('   ✅ YES - Has admin access');
      } else {
        console.log(`   ❌ NO - Current role: ${user.role}`);
        console.log('   💡 Need to update role to ADMIN or SUPER_ADMIN');
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkKenanRole();
