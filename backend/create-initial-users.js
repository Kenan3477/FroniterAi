import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createInitialUsers() {
  try {
    console.log('🚀 Creating initial users for Omnivox-AI...');

    // Create admin user
    const adminPassword = await bcrypt.hash('OmnivoxAdmin2025!', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@omnivox-ai.com' },
      update: {
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      },
      create: {
        username: 'admin',
        email: 'admin@omnivox-ai.com',
        password: adminPassword,
        firstName: 'System',
        lastName: 'Administrator',
        name: 'System Administrator',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create agent user
    const agentPassword = await bcrypt.hash('OmnivoxAgent2025!', 12);
    const agentUser = await prisma.user.upsert({
      where: { email: 'agent@omnivox-ai.com' },
      update: {
        password: agentPassword,
        role: 'AGENT',
        isActive: true
      },
      create: {
        username: 'agent',
        email: 'agent@omnivox-ai.com',
        password: agentPassword,
        firstName: 'Demo',
        lastName: 'Agent',
        name: 'Demo Agent',
        role: 'AGENT',
        isActive: true
      }
    });

    console.log('✅ Agent user created:', agentUser.email);

    // Create supervisor user
    const supervisorPassword = await bcrypt.hash('OmnivoxSupervisor2025!', 12);
    const supervisorUser = await prisma.user.upsert({
      where: { email: 'supervisor@omnivox-ai.com' },
      update: {
        password: supervisorPassword,
        role: 'SUPERVISOR',
        isActive: true
      },
      create: {
        username: 'supervisor',
        email: 'supervisor@omnivox-ai.com',
        password: supervisorPassword,
        firstName: 'Demo',
        lastName: 'Supervisor',
        name: 'Demo Supervisor',
        role: 'SUPERVISOR',
        isActive: true
      }
    });

    console.log('✅ Supervisor user created:', supervisorUser.email);

    console.log('\n🎯 Production Authentication Setup Complete!');
    console.log('════════════════════════════════════════════');
    console.log('Admin Login:      admin@omnivox-ai.com / OmnivoxAdmin2025!');
    console.log('Agent Login:      agent@omnivox-ai.com / OmnivoxAgent2025!');
    console.log('Supervisor Login: supervisor@omnivox-ai.com / OmnivoxSupervisor2025!');
    console.log('════════════════════════════════════════════');
    console.log('\n⚠️  SECURITY NOTICE: Change these passwords in production!');

  } catch (error) {
    console.error('❌ Error creating initial users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialUsers();