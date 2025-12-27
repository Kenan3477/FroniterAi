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
          admin: { email: updatedAdmin.email, isActive: updatedAdmin.isActive },
          credentials: {
            admin: { email: 'admin@omnivox-ai.com', password: 'OmnivoxAdmin2025!' },
            agent: { email: 'agent@omnivox-ai.com', password: 'OmnivoxAgent2025!' },
            supervisor: { email: 'supervisor@omnivox-ai.com', password: 'OmnivoxSupervisor2025!' }
          }
        });
      }

      return res.json({
        success: true,
        message: 'Users already exist',
        credentials: {
          admin: { email: 'admin@omnivox-ai.com', password: 'OmnivoxAdmin2025!' },
          agent: { email: 'agent@omnivox-ai.com', password: 'OmnivoxAgent2025!' },
          supervisor: { email: 'supervisor@omnivox-ai.com', password: 'OmnivoxSupervisor2025!' }
        }
      });
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('OmnivoxAdmin2025!', 12);
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
    const agentPassword = await bcrypt.hash('OmnivoxAgent2025!', 12);
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
    const supervisorPassword = await bcrypt.hash('OmnivoxSupervisor2025!', 12);
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
        admin: { email: 'admin@omnivox-ai.com', password: 'OmnivoxAdmin2025!' },
        agent: { email: 'agent@omnivox-ai.com', password: 'OmnivoxAgent2025!' },
        supervisor: { email: 'supervisor@omnivox-ai.com', password: 'OmnivoxSupervisor2025!' }
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

export default router;