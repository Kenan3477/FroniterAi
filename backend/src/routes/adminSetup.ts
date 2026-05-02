/**
 * Admin setup routes — initial provisioning and one-off fixes.
 * All routes require OMNIVOX_MAINTENANCE_SECRET (header, query ?secret=, or body.maintenanceSecret).
 */
import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { fixCallRecordsData } from '../controllers/adminController';
import { prisma } from '../database/index';
import { getMaintenanceSecret, maintenanceSecretMatches } from '../utils/routeSecurity';

const router = express.Router();

function requireMaintenanceSecret(req: Request, res: Response, next: NextFunction): void {
  if (!getMaintenanceSecret() || !maintenanceSecretMatches(req)) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  next();
}

router.use(requireMaintenanceSecret);

router.post('/create-users', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Creating initial users for Omnivox-AI...');

    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@omnivox-ai.com' },
    });

    const { forceActivate } = req.body;

    if (existingAdmin) {
      if (forceActivate) {
        console.log('🔓 Force activating admin user...');
        const updatedAdmin = await prisma.user.update({
          where: { email: 'admin@omnivox-ai.com' },
          data: { isActive: true },
        });
        console.log('✅ Admin user force-activated');

        return res.json({
          success: true,
          message: 'Admin user activated successfully',
          admin: { email: updatedAdmin.email, isActive: updatedAdmin.isActive },
        });
      }

      return res.json({
        success: true,
        message: 'Users already exist',
      });
    }

    const defaultPassword = process.env.ADMIN_PASSWORD || 'ADMIN_PASSWORD_NOT_SET';
    if (defaultPassword === 'ADMIN_PASSWORD_NOT_SET') {
      throw new Error('ADMIN_PASSWORD environment variable must be set');
    }
    const adminPassword = await bcrypt.hash(defaultPassword, 12);
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@omnivox-ai.com',
        password: adminPassword,
        firstName: 'System',
        lastName: 'Administrator',
        name: 'System Administrator',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin user created:', adminUser.email);

    const defaultAgentPassword = process.env.AGENT_PASSWORD || 'AGENT_PASSWORD_NOT_SET';
    if (defaultAgentPassword === 'AGENT_PASSWORD_NOT_SET') {
      throw new Error('AGENT_PASSWORD environment variable must be set');
    }
    const agentPassword = await bcrypt.hash(defaultAgentPassword, 12);
    const agentUser = await prisma.user.create({
      data: {
        username: 'agent',
        email: 'agent@omnivox-ai.com',
        password: agentPassword,
        firstName: 'Demo',
        lastName: 'Agent',
        name: 'Demo Agent',
        role: 'AGENT',
        isActive: true,
      },
    });

    console.log('✅ Agent user created:', agentUser.email);

    const defaultSupervisorPassword = process.env.SUPERVISOR_PASSWORD || 'SUPERVISOR_PASSWORD_NOT_SET';
    if (defaultSupervisorPassword === 'SUPERVISOR_PASSWORD_NOT_SET') {
      throw new Error('SUPERVISOR_PASSWORD environment variable must be set');
    }
    const supervisorPassword = await bcrypt.hash(defaultSupervisorPassword, 12);
    const supervisorUser = await prisma.user.create({
      data: {
        username: 'supervisor',
        email: 'supervisor@omnivox-ai.com',
        password: supervisorPassword,
        firstName: 'Demo',
        lastName: 'Supervisor',
        name: 'Demo Supervisor',
        role: 'SUPERVISOR',
        isActive: true,
      },
    });

    console.log('✅ Supervisor user created:', supervisorUser.email);

    res.json({
      success: true,
      message: 'Initial users created successfully!',
      users: [
        { email: adminUser.email, role: adminUser.role },
        { email: agentUser.email, role: agentUser.role },
        { email: supervisorUser.email, role: supervisorUser.role },
      ],
      credentials: {
        admin: { email: 'admin@omnivox-ai.com', password: 'SET_VIA_ADMIN_PASSWORD_ENV_VAR' },
        agent: { email: 'agent@omnivox-ai.com', password: 'SET_VIA_AGENT_PASSWORD_ENV_VAR' },
        supervisor: { email: 'supervisor@omnivox-ai.com', password: 'SET_VIA_SUPERVISOR_PASSWORD_ENV_VAR' },
      },
    });
  } catch (error) {
    console.error('❌ Error creating initial users:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create initial users', details: error },
    });
  }
});

router.get('/test-db', async (req: Request, res: Response) => {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    res.json({
      success: true,
      message: 'Database connection successful',
      tables: tables,
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Database connection failed', details: error },
    });
  }
});

router.post('/activate-admin', async (req: Request, res: Response) => {
  try {
    console.log('🔓 Activating admin user...');

    const updatedAdmin = await prisma.user.update({
      where: { email: 'admin@omnivox-ai.com' },
      data: { isActive: true },
    });

    console.log('✅ Admin user activated successfully');
    res.json({
      success: true,
      message: 'Admin user activated successfully',
      user: {
        email: updatedAdmin.email,
        isActive: updatedAdmin.isActive,
      },
    });
  } catch (error) {
    console.error('❌ Admin activation failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Admin activation failed', details: error },
    });
  }
});

router.get('/check-users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users LIMIT 1`;

    res.json({
      success: true,
      message: 'Users table exists',
      result: users,
    });
  } catch (error) {
    console.error('❌ Users table check failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Users table check failed', details: error },
    });
  }
});

router.post('/fix-call-records', ...fixCallRecordsData);

router.post('/fix-call-records-public', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Call records data fix triggered (maintenance secret)...');

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    const agentMap = new Map<number, string>();

    for (const user of allUsers) {
      let agent = await prisma.agent.findUnique({
        where: { email: user.email },
      });

      if (!agent) {
        const agentId = `agent-${user.id}`;
        agent = await prisma.agent.create({
          data: {
            agentId: agentId,
            firstName: user.firstName || user.username || 'Unknown',
            lastName: user.lastName || 'User',
            email: user.email,
            status: 'Available',
          },
        });
        console.log(`✅ Created agent for ${user.username}: ${agent.agentId}`);
      }

      agentMap.set(user.id, agent.agentId);
    }

    const adminUser = allUsers.find(
      (u: { role?: string; username?: string | null }) =>
        u.role === 'ADMIN' || u.username?.toLowerCase().includes('admin')
    );
    let agentUpdates = 0;

    if (adminUser && agentMap.has(adminUser.id)) {
      const adminAgentId = agentMap.get(adminUser.id)!;

      const updateResult = await prisma.callRecord.updateMany({
        where: {
          OR: [{ agentId: { equals: '' } }],
        },
        data: {
          agentId: adminAgentId,
        },
      });

      agentUpdates = updateResult.count;
    }

    const johnTurnerUpdates = await prisma.contact.updateMany({
      where: {
        AND: [{ firstName: 'John' }, { lastName: 'Turner' }],
      },
      data: {
        firstName: 'Unknown',
        lastName: 'Contact',
      },
    });

    const phoneFixQuery = `
      UPDATE "call_records" 
      SET "phoneNumber" = "dialedNumber" 
      WHERE ("phoneNumber" IS NULL OR "phoneNumber" = '' OR "phoneNumber" = 'Unknown') 
      AND "dialedNumber" IS NOT NULL 
      AND "dialedNumber" != '' 
      AND "dialedNumber" != 'Unknown'
    `;

    const phoneFixResult1 = await prisma.$executeRawUnsafe(phoneFixQuery);

    const stats = {
      totalCalls: await prisma.callRecord.count(),
      callsWithAgents: await prisma.callRecord.count({
        where: {
          agentId: {
            notIn: ['', 'NULL'],
          },
        },
      }),
      callsWithPhones: await prisma.callRecord.count({
        where: {
          phoneNumber: {
            notIn: ['', 'Unknown', 'NULL'],
          },
        },
      }),
      johnTurnerRemaining: await prisma.contact.count({
        where: {
          firstName: 'John',
          lastName: 'Turner',
        },
      }),
    };

    const fixResults = {
      agentRecordsCreated: agentMap.size,
      callRecordsUpdatedWithAgents: agentUpdates,
      johnTurnerContactsFixed: johnTurnerUpdates.count,
      phoneNumbersFixed: Number(phoneFixResult1),
      finalStats: stats,
    };

    console.log('✅ Call records data fix completed:', fixResults);

    res.json({
      success: true,
      message: 'Call records data fix completed successfully',
      results: fixResults,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fixing call records data:', error);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to fix call records data',
    });
  }
});

router.get('/fix-user-orgs', async (req: Request, res: Response) => {
  try {
    console.log('Moving all users to Omnivox organization...');

    const omnivoxOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';

    const result = await prisma.$executeRaw`
      UPDATE users SET "organizationId" = ${omnivoxOrgId}
      WHERE "organizationId" IS DISTINCT FROM ${omnivoxOrgId}
    `;

    const totalUsers = await prisma.user.count();
    const omnivoxUsersRaw = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM users WHERE "organizationId" = ${omnivoxOrgId}
    `;
    const omnivoxUsers = Number(omnivoxUsersRaw[0]?.count ?? 0);

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    console.log('✅ User organization fix completed');
    res.json({
      success: true,
      message: `Successfully updated user organization assignments`,
      data: {
        rowsAffected: Number(result),
        totalUsers: totalUsers,
        omnivoxUsers: omnivoxUsers,
        userList: allUsers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fixing user organizations:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test endpoint called');
    res.json({
      success: true,
      message: 'Endpoint is working',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.get('/check-all-users', async (req: Request, res: Response) => {
  try {
    console.log('Checking all users in the system...');

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    const orgRows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name FROM organizations WHERE name = 'Omnivox Organization' LIMIT 1
    `;
    const omnivoxOrg = orgRows[0];

    console.log('✅ User check completed');
    res.json({
      success: true,
      message: 'All users retrieved',
      data: {
        totalUsers: allUsers.length,
        omnivoxOrgId: omnivoxOrg?.id,
        users: allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error checking users:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.get('/fix-user-organizations', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Moving all users to Omnivox organization...');

    const omnivoxOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';

    const usersToMove = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM users
      WHERE "organizationId" IS NULL OR "organizationId" <> ${omnivoxOrgId}
    `;

    console.log(`Found ${usersToMove.length} users to move to Omnivox organization`);

    const updateResult = await prisma.$executeRaw`
      UPDATE users SET "organizationId" = ${omnivoxOrgId}
      WHERE "organizationId" IS NULL OR "organizationId" <> ${omnivoxOrgId}
    `;

    console.log(`✅ Moved users to Omnivox organization`);

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const inOrg = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM users WHERE "organizationId" = ${omnivoxOrgId}
    `;

    res.json({
      success: true,
      message: `Successfully updated organization for users`,
      data: {
        movedUsers: usersToMove.length,
        rowsAffected: Number(updateResult),
        totalUsers: allUsers.length,
        omnivoxUsers: Number(inOrg[0]?.count ?? 0),
        users: allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error moving users:', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
