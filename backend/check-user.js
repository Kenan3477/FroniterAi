const { PrismaClient } = require('@prisma/client');

async function checkAndCreateUser() {
  const prisma = new PrismaClient();
  
  try {
    const userId = '29da8aee-5424-41a3-96f9-3722f44fb838';
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    console.log('=== USER AND AGENT CHECK ===\n');
    
    // Check if user exists
    console.log('1. Checking if user exists...');
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true
      }
    });
    
    if (existingUser) {
      console.log('✅ User exists:');
      console.log(JSON.stringify(existingUser, null, 2));
    } else {
      console.log('❌ User does not exist in database');
      
      // Create the user
      console.log('\n2. Creating user...');
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email: 'admin@omnivox.ai',
          name: 'Admin User',
          role: 'ADMIN',
          organizationId: userOrgId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ User created:', newUser.email);
    }
    
    // Check if agent record exists
    console.log('\n3. Checking agent records...');
    const agents = await prisma.user.findMany({
      where: {
        organizationId: userOrgId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log(`Found ${agents.length} agents in organization:`);
    agents.forEach(agent => {
      console.log(`- ${agent.name} (${agent.email}) - Role: ${agent.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUser();