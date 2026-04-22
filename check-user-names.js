const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNames() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      firstName: true,
      lastName: true
    }
  });
  
  console.log('👤 User name fields:');
  console.table(users);
  
  console.log('\n⚠️  Checking for null/undefined names:');
  users.forEach(u => {
    if (!u.name) {
      console.log(`   ❌ ${u.email}: name is ${u.name}`);
      console.log(`      - firstName: ${u.firstName || 'null'}`);
      console.log(`      - lastName: ${u.lastName || 'null'}`);
    } else {
      console.log(`   ✅ ${u.email}: name = "${u.name}"`);
    }
  });
  
  await prisma.$disconnect();
}

checkNames();
