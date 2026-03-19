/**
 * Admin Setup Routes - For initial user creation
 */
import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/admin-setup/create-users - Create initial users
router.post('/create-users', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Creating initial users for Omnivox-AI...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@omnivox-ai.com' }
    });

    // Check for force activation parameter
    const { forceActivate } = req.body;

    if (existingAdmin) {
      // If forceActivate is true, activate the admin user
      if (forceActivate) {
        console.log('🔓 Force activating admin user...');
        const updatedAdmin = await prisma.user.update({
          where: { email: 'admin@omnivox-ai.com' },
          data: { isActive: true }
        });
        console.log('✅ Admin user force-activated');
        
        return res.json({
          success: true,
          message: 'Admin user activated successfully',
          admin: { email: updatedAdmin.email, isActive: updatedAdmin.isActive }
          // SECURITY: Credentials removed from API response
        });
      }

      return res.json({
        success: true,
        message: 'Users already exist'
        // SECURITY: Credentials removed from API response
      });
    }

    // Create admin user
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
    const agentUser = await prisma.user.create({
      data: {
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
    const supervisorUser = await prisma.user.create({
      data: {
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

    res.json({
      success: true,
      message: 'Initial users created successfully!',
      users: [
        { email: adminUser.email, role: adminUser.role },
        { email: agentUser.email, role: agentUser.role },
        { email: supervisorUser.email, role: supervisorUser.role }
      ],
      credentials: {
        admin: { email: 'admin@omnivox-ai.com', password: 'SET_VIA_ADMIN_PASSWORD_ENV_VAR' },
        agent: { email: 'agent@omnivox-ai.com', password: 'SET_VIA_AGENT_PASSWORD_ENV_VAR' },
        supervisor: { email: 'supervisor@omnivox-ai.com', password: 'SET_VIA_SUPERVISOR_PASSWORD_ENV_VAR' }
      }
    });

  } catch (error) {
    console.error('❌ Error creating initial users:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create initial users', details: error }
    });
  }
});

// GET /api/admin-setup/test-db - Test database connection
router.get('/test-db', async (req: Request, res: Response) => {
  try {
    // Try to execute a raw query to check table existence
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    res.json({
      success: true,
      message: 'Database connection successful',
      tables: tables
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Database connection failed', details: error }
    });
  }
});

// POST /api/admin-setup/activate-admin - Activate admin user (temporary fix)
router.post('/activate-admin', async (req: Request, res: Response) => {
  try {
    console.log('🔓 Activating admin user...');
    
    // Find and activate admin user
    const updatedAdmin = await prisma.user.update({
      where: { email: 'admin@omnivox-ai.com' },
      data: { isActive: true }
    });

    console.log('✅ Admin user activated successfully');
    res.json({
      success: true,
      message: 'Admin user activated successfully',
      user: {
        email: updatedAdmin.email,
        isActive: updatedAdmin.isActive
      }
    });
  } catch (error) {
    console.error('❌ Admin activation failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Admin activation failed', details: error }
    });
  }
});

// GET /api/admin-setup/check-users - Check if users table and any users exist
router.get('/check-users', async (req: Request, res: Response) => {
  try {
    // Check if users table exists by querying it
    const users = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users LIMIT 1`;
    
    res.json({
      success: true,
      message: 'Users table exists',
      result: users
    });
  } catch (error) {
    console.error('❌ Users table check failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Users table check failed', details: error }
    });
  }
});

// POST /api/admin-setup/fix-call-records - Fix call records data issues
import { fixCallRecordsData } from '../controllers/adminController';
router.post('/fix-call-records', ...fixCallRecordsData);

// POST /api/admin-setup/fix-call-records-public - Public version for emergency cleanup
router.post('/fix-call-records-public', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Public call records data fix triggered...');

    // Include the same fix logic but without authentication requirement
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 1. Ensure all users have agent records
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    const agentMap = new Map();

    for (const user of allUsers) {
      let agent = await prisma.agent.findUnique({
        where: { email: user.email }
      });

      if (!agent) {
        const agentId = `agent-${user.id}`;
        agent = await prisma.agent.create({
          data: {
            agentId: agentId,
            firstName: user.firstName || user.username || 'Unknown',
            lastName: user.lastName || 'User',
            email: user.email,
            status: 'Available'
          }
        });
        console.log(`✅ Created agent for ${user.username}: ${agent.agentId}`);
      }

      agentMap.set(user.id, agent.agentId);
    }

    // 2. Fix call records with missing agent IDs
    const callsNeedingAgents = await prisma.callRecord.findMany({
      where: {
        OR: [
          { agentId: { equals: '' } }
        ]
      }
    });

    const adminUser = allUsers.find((u: any) => u.role === 'ADMIN' || u.username?.toLowerCase().includes('admin'));
    let agentUpdates = 0;

    if (adminUser && agentMap.has(adminUser.id)) {
      const adminAgentId = agentMap.get(adminUser.id);
      
      const updateResult = await prisma.callRecord.updateMany({
        where: {
          OR: [
            { agentId: { equals: '' } }
          ]
        },
        data: {
          agentId: adminAgentId
        }
      });

      agentUpdates = updateResult.count;
    }

    // 3. Fix John Turner contacts
    const johnTurnerUpdates = await prisma.contact.updateMany({
      where: {
        AND: [
          { firstName: 'John' },
          { lastName: 'Turner' }
        ]
      },
      data: {
        firstName: 'Unknown',
        lastName: 'Contact'
      }
    });

    // 4. Fix phone numbers
    const phoneFixQuery = `
      UPDATE "call_records" 
      SET "phoneNumber" = "dialedNumber" 
      WHERE ("phoneNumber" IS NULL OR "phoneNumber" = '' OR "phoneNumber" = 'Unknown') 
      AND "dialedNumber" IS NOT NULL 
      AND "dialedNumber" != '' 
      AND "dialedNumber" != 'Unknown'
    `;
    
    const phoneFixResult1 = await prisma.$executeRawUnsafe(phoneFixQuery);

    // 5. Final statistics
    const stats = {
      totalCalls: await prisma.callRecord.count(),
      callsWithAgents: await prisma.callRecord.count({
        where: { 
          agentId: { 
            notIn: ['', 'NULL'] 
          }
        }
      }),
      callsWithPhones: await prisma.callRecord.count({
        where: { 
          phoneNumber: { 
            notIn: ['', 'Unknown', 'NULL']
          }
        }
      }),
      johnTurnerRemaining: await prisma.contact.count({
        where: {
          firstName: 'John',
          lastName: 'Turner'
        }
      })
    };

    const fixResults = {
      agentRecordsCreated: agentMap.size,
      callRecordsUpdatedWithAgents: agentUpdates,
      johnTurnerContactsFixed: johnTurnerUpdates.count,
      phoneNumbersFixed: Number(phoneFixResult1),
      finalStats: stats
    };

    console.log('✅ Public call records data fix completed:', fixResults);

    res.json({
      success: true,
      message: 'Call records data fix completed successfully',
      results: fixResults
    });

    await prisma.$disconnect();

  } catch (error: any) {
    console.error('❌ Error fixing call records data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fix call records data'
    });
  }
});

// TEMPORARY ENDPOINT: Fix Railway production database
router.get('/fix-database', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Running manual Railway database fix...');
    
    const { migrateProductionDatabase } = require('../database/migrate-production');
    const result = await migrateProductionDatabase();
    
    console.log('✅ Railway database fix completed');
    res.json({ 
      success: true, 
      message: 'Railway database fix completed successfully',
      result 
    });
  } catch (error: any) {
    console.error('❌ Error fixing Railway database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to fix Railway database'
    });
  }
});

// SIMPLE TEST ENDPOINT: Check if endpoint routing works
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test endpoint called');
    res.json({ 
      success: true, 
      message: 'Endpoint is working',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DEBUG ENDPOINT: Check campaign state without auth
router.get('/check-campaigns', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Checking current campaign state...');
    
    const omnivoxOrg = await prisma.organization.findFirst({
      where: { name: 'Omnivox Organization' }
    });
    
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e' }
    });
    
    const user509 = await prisma.user.findUnique({
      where: { id: 509 }
    });
    
    const agent = await prisma.agent.findUnique({
      where: { id: 'user-509' }
    });
    
    const assignments = await prisma.agentCampaignAssignment.findMany({
      where: { agentId: 'user-509' },
      include: { campaign: true }
    });
    
    console.log('✅ Campaign check completed');
    res.json({ 
      success: true, 
      message: 'Campaign state retrieved',
      data: {
        organization: omnivoxOrg,
        user509: user509 ? { id: user509.id, email: user509.email, orgId: user509.organizationId } : null,
        campaigns: campaigns.map(c => ({ id: c.id, name: c.name })),
        agent: agent ? { id: agent.id, userId: agent.userId } : null,
        assignments: assignments.map(a => ({ campaignId: a.campaignId, campaignName: a.campaign.name }))
      }
    });
  } catch (error: any) {
    console.error('❌ Error checking campaigns:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;