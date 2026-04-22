// Simple test service to check if the issue is with the complex query
import express from 'express';

import { prisma } from '../lib/prisma';
const router = express.Router();

// Simple test route that just returns static data
router.get('/test', (req, res) => {
  console.log('📝 Test endpoint called');
  res.json({
    success: true,
    data: {
      organizations: [
        {
          id: 'test-org-1',
          name: 'test-org',
          displayName: 'Test Organization',
          description: 'Test organization for debugging',
          userCount: 0,
          contactCount: 0,
          campaignCount: 0,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ]
    }
  });
});

// Simple organizations endpoint
router.get('/organizations', async (req, res) => {
  console.log('📝 Simple organizations endpoint called');
  
  try {
    // Use simple prisma query
    const { PrismaClient } = require('@prisma/client');
        const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        industry: true,
        createdAt: true
      },
      take: 10
    });
    
    res.json({
      success: true,
      data: {
        organizations: organizations.map(org => ({
          ...org,
          userCount: 0,
          contactCount: 0,
          campaignCount: 0,
          lastActivity: org.createdAt.toISOString()
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error in simple organizations endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      }
    });
  }
});

// Simple dashboard endpoint
router.get('/dashboard', (req, res) => {
  console.log('📝 Simple dashboard endpoint called');
  res.json({
    success: true,
    data: {
      totalOrganizations: 1,
      totalUsers: 2,
      totalContacts: 0,
      totalCampaigns: 0,
      totalCallRecords: 0,
      organizationBreakdown: [
        {
          id: 'cmmv05bnn0000afc9j1tn0d5c',
          name: 'default-org',
          userCount: 2,
          contactCount: 0,
          campaignCount: 0
        }
      ]
    }
  });
});

export default router;