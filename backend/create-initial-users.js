import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createInitialUsers() {
  try {
    console.log('🚀 Creating initial users for Omnivox-AI...');

    // Create admin user
    const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET';
    if (defaultAdminPassword === 'ADMIN_PASSWORD_NOT_SET') {
      throw new Error('ADMIN_PASSWORD environment variable must be set');
    }
    const adminPassword = await bcrypt.hash(defaultAdminPassword, 12);
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
    const defaultAgentPassword = process.env.AGENT_PASSWORD || 'AGENT_PASSWORD_NOT_SET';
    if (defaultAgentPassword === 'AGENT_PASSWORD_NOT_SET') {
      throw new Error('AGENT_PASSWORD environment variable must be set');
    }
    const agentPassword = await bcrypt.hash(defaultAgentPassword, 12);
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
    const defaultSupervisorPassword = process.env.SUPERVISOR_PASSWORD || 'SUPERVISOR_PASSWORD_NOT_SET';
    if (defaultSupervisorPassword === 'SUPERVISOR_PASSWORD_NOT_SET') {
      throw new Error('SUPERVISOR_PASSWORD environment variable must be set');
    }
    const supervisorPassword = await bcrypt.hash(defaultSupervisorPassword, 12);
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
    console.log('Admin Login:      admin@omnivox-ai.com / [SET_VIA_ADMIN_PASSWORD_ENV_VAR]');
    console.log('Agent Login:      agent@omnivox-ai.com / [SET_VIA_AGENT_PASSWORD_ENV_VAR]');
    console.log('Supervisor Login: supervisor@omnivox-ai.com / [SET_VIA_SUPERVISOR_PASSWORD_ENV_VAR]');
    console.log('════════════════════════════════════════════');
    console.log('\n⚠️  SECURITY NOTICE: Passwords are set via environment variables!');

  } catch (error) {
    console.error('❌ Error creating initial users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialUsers();