/**
 * Very Simple Business Settings Routes - Direct Database Access
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Simple organizations endpoint
router.get('/organizations', async (req, res) => {
  try {
    console.log('📋 Simple organizations endpoint called');
    
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        industry: true,
        size: true,
        createdAt: true,
        updatedAt: true
      },
      take: 50
    });
    
    console.log(`📊 Found ${organizations.length} organizations`);
    
    // Transform to expected format
    const formattedOrgs = organizations.map(org => ({
      ...org,
      status: 'Active',
      type: 'Business',
      userCount: 0, // We'll calculate this later
      contactCount: 0,
      campaignCount: 0,
      lastActivity: org.updatedAt.toISOString()
    }));
    
    res.json({
      success: true,
      data: {
        organizations: formattedOrgs
      }
    });
    
  } catch (error) {
    console.error('❌ Error in organizations endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch organizations',
        details: error.message
      }
    });
  }
});

// Simple dashboard endpoint
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📋 Simple dashboard endpoint called');
    
    const [orgCount, userCount] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count()
    ]);
    
    console.log(`📊 Found ${orgCount} organizations, ${userCount} users`);
    
    res.json({
      success: true,
      data: {
        totalOrganizations: orgCount,
        totalUsers: userCount,
        totalContacts: 0,
        totalCampaigns: 0,
        totalCallRecords: 0,
        organizationBreakdown: [] // We'll fill this later
      }
    });
    
  } catch (error) {
    console.error('❌ Error in dashboard endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch dashboard stats',
        details: error.message
      }
    });
  }
});

export default router;