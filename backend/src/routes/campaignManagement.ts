import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { campaignEvents, agentEvents } from '../utils/eventHelpers';
import { createRestApiCall } from '../services/twilioService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/campaign-management/campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const { status, category, type, search, page, limit } = req.query;

    // Build where clause for filtering
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    // Fetch campaigns from database with related data
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        agentAssignments: {
          include: {
            agent: true
          }
        },
        _count: {
          select: {
            interactions: true,
            callRecords: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform to match frontend interface
    let transformedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      campaignId: campaign.campaignId,
      name: campaign.name,
      displayName: campaign.name,
      description: campaign.description || '',
      status: campaign.status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED',
      category: 'SALES' as const, // Default category
      type: 'OUTBOUND' as const, // Default type
      dialingMode: 'PROGRESSIVE' as const, // Map from dialMethod
      dialMethod: campaign.dialMethod as 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP',
      dialSpeed: campaign.speed,
      maxCallsPerAgent: campaign.maxCallsPerAgent || 1,
      maxAttemptsPerRecord: 3, // Default value
      abandonRateThreshold: campaign.abandonRateThreshold || 0.05,
      pacingMultiplier: campaign.pacingMultiplier || 1.0,
      defaultTimezone: 'UTC', // Default timezone
      startDate: campaign.createdAt.toISOString(),
      targetLeads: 0, // Will be calculated from data lists
      targetCompletions: 0, // Will be calculated
      expectedDuration: 60, // Default duration in minutes
      totalTargets: 0,
      totalCalls: campaign._count.callRecords,
      totalConnections: 0,
      totalConversions: 0,
      totalRevenue: 0,
      budget: 0,
      budgetCurrency: 'USD',
      priority: 1,
      approvalStatus: 'NOT_REQUIRED' as const,
      isActive: campaign.status === 'Active',
      agentCount: campaign.agentAssignments.length,
      predictiveDialingEnabled: false,
      maxConcurrentCalls: campaign.maxCallsPerAgent || 1,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      assignedAgents: campaign.agentAssignments.map(assignment => ({
        id: assignment.agent.agentId,
        name: `${assignment.agent.firstName} ${assignment.agent.lastName}`,
        email: assignment.agent.email
      })),
      dataLists: [], // Will be populated when data list integration is implemented
      _count: {
        interactions: campaign._count.interactions,
        contacts: 0, // Will be calculated from data lists
        completedCalls: campaign._count.callRecords
      }
    }));

    // Apply additional filters that require transformation
    if (category) {
      transformedCampaigns = transformedCampaigns.filter(c => c.category === category);
    }
    if (type) {
      transformedCampaigns = transformedCampaigns.filter(c => c.type === type);
    }
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      transformedCampaigns = transformedCampaigns.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.displayName.toLowerCase().includes(searchTerm) ||
        (c.description && c.description.toLowerCase().includes(searchTerm))
      );
    }

    // Pagination
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const offset = (pageNumber - 1) * limitNumber;
    const paginatedCampaigns = transformedCampaigns.slice(offset, offset + limitNumber);

    // Support both response formats for backward compatibility
    if (page || limit) {
      res.json({
        success: true,
        data: {
          campaigns: paginatedCampaigns,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: transformedCampaigns.length,
            totalPages: Math.ceil(transformedCampaigns.length / limitNumber)
          }
        }
      });
    } else {
      res.json({
        success: true,
        data: transformedCampaigns,
        count: transformedCampaigns.length
      });
    }
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// GET /api/admin/campaign-management/templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    // For now, return empty templates array
    // Campaign templates will be implemented as a separate feature
    res.json({
      success: true,
      data: [],
      count: 0
    });
  } catch (error) {
    console.error('Error fetching campaign templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign templates'
    });
  }
});

// GET /api/admin/campaign-management/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Fetch campaigns from database for stats calculation
    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: {
          select: {
            interactions: true,
            callRecords: true
          }
        }
      }
    });

    const activeCampaigns = campaigns.filter(c => c.status === 'Active');
    const totalInteractions = campaigns.reduce((sum, c) => sum + (c._count?.interactions || 0), 0);
    const totalContacts = 0; // Will be calculated from data lists when integrated
    const totalCompletedCalls = campaigns.reduce((sum, c) => sum + (c._count?.callRecords || 0), 0);

    const stats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
      draftCampaigns: campaigns.filter(c => c.status === 'Inactive').length,
      pausedCampaigns: campaigns.filter(c => c.status === 'Paused').length,
      completedCampaigns: campaigns.filter(c => c.status === 'Completed').length,
      totalTemplates: 0, // Templates not implemented yet
      totalInteractions,
      totalContacts,
      totalCompletedCalls,
      conversionRate: totalContacts > 0 ? (totalCompletedCalls / totalContacts * 100).toFixed(2) : '0.00',
      averageCallsPerCampaign: campaigns.length > 0 ? (totalCompletedCalls / campaigns.length).toFixed(1) : '0.0'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching campaign stats' }
    });
  }
});

// GET /api/admin/campaign-management/data-lists - Get all available data lists
router.get('/data-lists', async (req: Request, res: Response) => {
  try {
    const dataLists = await prisma.dataList.findMany({
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const transformedLists = dataLists.map(list => ({
      id: list.id,
      listId: list.listId,
      name: list.name,
      campaignId: list.campaignId,
      active: list.active,
      totalContacts: list._count.contacts,
      blendWeight: list.blendWeight,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt
    }));

    res.json({
      success: true,
      data: {
        dataLists: transformedLists
      }
    });

  } catch (error) {
    console.error('Error fetching data lists:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch data lists' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;

    // Validate required fields
    if (!campaignData.name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign name is required' }
      });
    }

    // Create campaign in database
    const newCampaign = await prisma.campaign.create({
      data: {
        campaignId: `campaign_${Date.now()}`,
        name: campaignData.name,
        description: campaignData.description || '',
        dialMethod: campaignData.dialMethod || 'Progressive',
        speed: campaignData.dialSpeed || 2.0,
        status: 'Inactive', // Start inactive, user can activate later
        isActive: false, // NEW: Campaign starts disabled until manually activated
        outboundNumber: campaignData.outboundNumber || null, // NEW: CLI number selection
        maxCallsPerAgent: campaignData.maxCallsPerAgent || 1,
        abandonRateThreshold: campaignData.abandonRateThreshold || 0.05,
        pacingMultiplier: campaignData.pacingMultiplier || 1.0,
        recordCalls: campaignData.recordCalls || false,
        allowTransfers: campaignData.allowTransfers || false,
        campaignScript: campaignData.openingScript || '',
        fieldMapping: JSON.stringify({}), // Empty field mapping initially
        retrySettings: JSON.stringify({
          maxAttempts: campaignData.maxAttemptsPerRecord || 3,
          retryDelay: 3600 // 1 hour default retry delay
        }),
        hoursOfOperation: JSON.stringify({
          timezone: campaignData.defaultTimezone || 'UTC',
          schedule: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '17:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' }
          }
        })
      },
      include: {
        agentAssignments: {
          include: {
            agent: true
          }
        },
        _count: {
          select: {
            interactions: true,
            callRecords: true
          }
        }
      }
    });

    // Transform response to match frontend interface
    const transformedCampaign = {
      id: newCampaign.id,
      campaignId: newCampaign.campaignId,
      name: newCampaign.name,
      displayName: newCampaign.name,
      description: newCampaign.description || '',
      status: newCampaign.status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED',
      category: 'SALES' as const,
      type: 'OUTBOUND' as const,
      dialingMode: 'PROGRESSIVE' as const,
      dialMethod: newCampaign.dialMethod as 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP',
      dialSpeed: newCampaign.speed,
      maxCallsPerAgent: newCampaign.maxCallsPerAgent || 1,
      maxAttemptsPerRecord: 3,
      abandonRateThreshold: newCampaign.abandonRateThreshold || 0.05,
      pacingMultiplier: newCampaign.pacingMultiplier || 1.0,
      defaultTimezone: 'UTC',
      startDate: newCampaign.createdAt.toISOString(),
      targetLeads: 0,
      targetCompletions: 0,
      expectedDuration: 60,
      totalTargets: 0,
      totalCalls: newCampaign._count.callRecords,
      totalConnections: 0,
      totalConversions: 0,
      totalRevenue: 0,
      budget: 0,
      budgetCurrency: 'USD',
      priority: 1,
      approvalStatus: 'NOT_REQUIRED' as const,
      isActive: newCampaign.status === 'Active',
      agentCount: newCampaign.agentAssignments.length,
      predictiveDialingEnabled: false,
      maxConcurrentCalls: newCampaign.maxCallsPerAgent || 1,
      createdAt: newCampaign.createdAt.toISOString(),
      updatedAt: newCampaign.updatedAt.toISOString(),
      assignedAgents: newCampaign.agentAssignments.map(assignment => ({
        id: assignment.agent.agentId,
        name: `${assignment.agent.firstName} ${assignment.agent.lastName}`,
        email: assignment.agent.email
      })),
      dataLists: [],
      _count: {
        interactions: newCampaign._count.interactions,
        contacts: 0,
        completedCalls: newCampaign._count.callRecords
      }
    };

    // Emit campaign created event
    await campaignEvents.created({
      campaignId: newCampaign.campaignId,
      campaignName: newCampaign.name,
      status: newCampaign.status,
      organizationId: 'default', // Add required organizationId
      agentCount: newCampaign.agentAssignments.length,
      dialMethod: newCampaign.dialMethod,
    });

    res.status(201).json({
      success: true,
      data: {
        campaign: transformedCampaign,
        message: 'Campaign created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error creating campaign' }
    });
  }
});

// PUT /api/admin/campaign-management/campaigns/:id
router.put('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find existing campaign
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Update campaign in database
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: updateData.name || existingCampaign.name,
        description: updateData.description || existingCampaign.description,
        dialMethod: updateData.dialMethod || existingCampaign.dialMethod,
        speed: updateData.dialSpeed || existingCampaign.speed,
        status: updateData.status || existingCampaign.status,
        maxCallsPerAgent: updateData.maxCallsPerAgent || existingCampaign.maxCallsPerAgent,
        abandonRateThreshold: updateData.abandonRateThreshold || existingCampaign.abandonRateThreshold,
        pacingMultiplier: updateData.pacingMultiplier || existingCampaign.pacingMultiplier,
        recordCalls: updateData.recordCalls ?? existingCampaign.recordCalls,
        allowTransfers: updateData.allowTransfers ?? existingCampaign.allowTransfers,
        campaignScript: updateData.openingScript || existingCampaign.campaignScript,
      },
      include: {
        agentAssignments: {
          include: {
            agent: true
          }
        },
        _count: {
          select: {
            interactions: true,
            callRecords: true
          }
        }
      }
    });

    // Transform response
    const transformedCampaign = {
      id: updatedCampaign.id,
      campaignId: updatedCampaign.campaignId,
      name: updatedCampaign.name,
      displayName: updatedCampaign.name,
      description: updatedCampaign.description || '',
      status: updatedCampaign.status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED',
      category: 'SALES' as const,
      type: 'OUTBOUND' as const,
      dialingMode: 'PROGRESSIVE' as const,
      dialMethod: updatedCampaign.dialMethod as 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP',
      dialSpeed: updatedCampaign.speed,
      maxCallsPerAgent: updatedCampaign.maxCallsPerAgent || 1,
      maxAttemptsPerRecord: 3,
      abandonRateThreshold: updatedCampaign.abandonRateThreshold || 0.05,
      pacingMultiplier: updatedCampaign.pacingMultiplier || 1.0,
      defaultTimezone: 'UTC',
      startDate: updatedCampaign.createdAt.toISOString(),
      targetLeads: 0,
      targetCompletions: 0,
      expectedDuration: 60,
      totalTargets: 0,
      totalCalls: updatedCampaign._count.callRecords,
      totalConnections: 0,
      totalConversions: 0,
      totalRevenue: 0,
      budget: 0,
      budgetCurrency: 'USD',
      priority: 1,
      approvalStatus: 'NOT_REQUIRED' as const,
      isActive: updatedCampaign.status === 'Active',
      agentCount: updatedCampaign.agentAssignments.length,
      predictiveDialingEnabled: false,
      maxConcurrentCalls: updatedCampaign.maxCallsPerAgent || 1,
      createdAt: updatedCampaign.createdAt.toISOString(),
      updatedAt: updatedCampaign.updatedAt.toISOString(),
      assignedAgents: updatedCampaign.agentAssignments.map(assignment => ({
        id: assignment.agent.agentId,
        name: `${assignment.agent.firstName} ${assignment.agent.lastName}`,
        email: assignment.agent.email
      })),
      dataLists: [],
      _count: {
        interactions: updatedCampaign._count.interactions,
        contacts: 0,
        completedCalls: updatedCampaign._count.callRecords
      }
    };

    // Emit campaign updated event
    await campaignEvents.updated({
      campaignId: updatedCampaign.campaignId,
      campaignName: updatedCampaign.name,
      status: updatedCampaign.status,
      organizationId: 'default', // Add required organizationId
      agentCount: updatedCampaign.agentAssignments.length,
      dialMethod: updatedCampaign.dialMethod,
      previousState: {
        name: existingCampaign.name,
        status: existingCampaign.status
      }
    });

    res.json({
      success: true,
      data: {
        campaign: transformedCampaign,
        message: 'Campaign updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error updating campaign' }
    });
  }
});

// DELETE /api/admin/campaign-management/campaigns/:id
router.delete('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Delete campaign (this will cascade to related records due to Prisma schema)
    const deletedCampaign = await prisma.campaign.delete({
      where: { id }
    });

    // Emit campaign stopped event (closest to deleted)
    await campaignEvents.stopped({
      campaignId: deletedCampaign.campaignId,
      campaignName: deletedCampaign.name,
      status: deletedCampaign.status,
      organizationId: 'default', // Add required organizationId
      agentCount: 0, // Since campaign is being deleted
      dialMethod: deletedCampaign.dialMethod
    });

    res.json({
      success: true,
      data: {
        campaign: deletedCampaign,
        message: 'Campaign deleted successfully'
      }
    });

  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error deleting campaign' }
    });
  }
});

// CAMPAIGN DATA LIST MANAGEMENT

// GET /api/admin/campaign-management/campaigns/:id/data-lists
router.get('/campaigns/:id/data-lists', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Get data lists assigned to this campaign
    const dataLists = await prisma.dataList.findMany({
      where: {
        campaignId: campaign.campaignId
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    // Transform to match frontend interface
    const transformedLists = dataLists.map(list => ({
      id: list.id,
      listId: list.listId,
      name: list.name,
      campaignId: list.campaignId,
      active: list.active,
      blendWeight: list.blendWeight || 0,
      totalContacts: list._count.contacts,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt
    }));

    res.json({
      success: true,
      data: transformedLists,
      count: transformedLists.length
    });

  } catch (error) {
    console.error('Error fetching campaign data lists:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching data lists' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:id/assign-data-list
router.post('/campaigns/:id/assign-data-list', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { listId, blendWeight = 100 } = req.body;

    if (!listId) {
      return res.status(400).json({
        success: false,
        error: { message: 'List ID is required' }
      });
    }

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Check if data list exists
    const dataList = await prisma.dataList.findUnique({
      where: { listId }
    });

    if (!dataList) {
      return res.status(404).json({
        success: false,
        error: { message: 'Data list not found' }
      });
    }

    // Assign data list to campaign
    const updatedList = await prisma.dataList.update({
      where: { listId },
      data: {
        campaignId: campaign.campaignId,
        active: true,
        blendWeight: Math.max(1, Math.min(100, blendWeight)),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        listId: updatedList.listId,
        name: updatedList.name,
        campaignId: updatedList.campaignId,
        active: updatedList.active,
        blendWeight: updatedList.blendWeight,
        totalContacts: updatedList._count.contacts,
        message: 'Data list assigned to campaign successfully'
      }
    });

  } catch (error) {
    console.error('Error assigning data list to campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error assigning data list' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:id/generate-queue
router.post('/campaigns/:id/generate-queue', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { maxRecords = 100 } = req.body;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Get active data lists for this campaign
    const dataLists = await prisma.dataList.findMany({
      where: {
        campaignId: campaign.campaignId,
        active: true
      }
    });

    if (dataLists.length === 0) {
      return res.json({
        success: false,
        message: 'No active data lists found for this campaign',
        data: {
          generated: 0,
          campaignId: campaign.campaignId,
          entries: []
        }
      });
    }

    // Get dialable contacts from all active data lists
    const dialableContacts = await prisma.contact.findMany({
      where: {
        listId: {
          in: dataLists.map(list => list.listId)
        },
        status: {
          notIn: ['MaxAttempts', 'DoNotCall', 'Invalid']
        },
        locked: false,
        OR: [
          {
            lastAttempt: null
          },
          {
            lastAttempt: {
              lt: new Date(Date.now() - 3600000) // 1 hour ago for retry eligibility
            }
          }
        ]
      },
      orderBy: [
        { attemptCount: 'asc' },
        { createdAt: 'asc' }
      ],
      take: maxRecords
    });

    // Clear existing queue entries for this campaign
    await prisma.dialQueueEntry.deleteMany({
      where: {
        campaignId: campaign.campaignId
      }
    });

    let totalGenerated = 0;
    const queueEntries = [];

    // Generate queue entries for dialable contacts
    for (const contact of dialableContacts) {
      const queueEntry = await prisma.dialQueueEntry.create({
        data: {
          queueId: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          campaignId: campaign.campaignId,
          listId: contact.listId,
          contactId: contact.contactId,
          status: 'queued',
          priority: contact.attemptCount === 0 ? 1 : 2, // Priority: new contacts first
          queuedAt: new Date()
        },
        include: {
          contact: true,
          list: true
        }
      });

      queueEntries.push(queueEntry);
      totalGenerated++;
    }

    res.json({
      success: true,
      data: {
        generated: totalGenerated,
        campaignId: campaign.campaignId,
        entries: queueEntries,
        message: `Generated ${totalGenerated} queue entries from ${dataLists.length} data lists`
      }
    });

  } catch (error) {
    console.error('Error generating queue for campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error generating queue' }
    });
  }
});

// GET /api/admin/campaign-management/campaigns/:id/contacts
router.get('/campaigns/:id/contacts', async (req: Request, res: Response) => {
  try {
    const campaignId = req.params.id;

    // Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Find data lists assigned to this campaign using the campaignId field
    const assignedDataLists = await prisma.dataList.findMany({
      where: { 
        campaignId: campaign.campaignId,  // Use the campaign's campaignId field
        active: true 
      },
      include: {
        contacts: {
          take: 100, // Limit to first 100 contacts for UI display
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Flatten contacts from all assigned data lists
    const allContacts: any[] = [];
    assignedDataLists.forEach(dataList => {
      dataList.contacts.forEach(contact => {
        allContacts.push({
          ...contact,
          listName: dataList.name,
          listId: dataList.listId
        });
      });
    });

    res.json({
      success: true,
      data: allContacts,
      count: allContacts.length,
      message: allContacts.length > 0 
        ? `Found ${allContacts.length} contacts from ${assignedDataLists.length} data lists`
        : 'No contacts found - campaign may not have any data lists assigned'
    });

  } catch (error) {
    console.error('Error fetching campaign contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching campaign contacts' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:id/dial-next
router.post('/campaigns/:id/dial-next', async (req: Request, res: Response) => {
  try {
    const campaignIdParam = req.params.id;
    const { agentId, contactId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agent ID is required' }
      });
    }

    // Find the campaign (using string ID)
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignIdParam }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Check if campaign is active
    if (campaign.status !== 'Active') {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign must be active to dial contacts' }
      });
    }

    // Find next contact to dial (either specified contactId or next queued contact)
    let queueEntry;
    
    if (contactId) {
      // Dial specific contact
      queueEntry = await prisma.dialQueueEntry.findFirst({
        where: {
          campaignId: campaignIdParam,
          contactId: contactId,
          status: 'queued'
        },
        include: {
          contact: true,
          list: true
        }
      });
    } else {
      // Find next available contact in queue (highest priority, oldest first)
      queueEntry = await prisma.dialQueueEntry.findFirst({
        where: {
          campaignId: campaignIdParam,
          status: 'queued'
        },
        orderBy: [
          { priority: 'asc' },  // Higher priority first (1 = highest)
          { queuedAt: 'asc' }   // Oldest first
        ],
        include: {
          contact: true,
          list: true
        }
      });
    }

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: { message: 'No contacts available to dial in queue' }
      });
    }

    // Update queue entry to dialing status
    const updatedEntry = await prisma.dialQueueEntry.update({
      where: { id: queueEntry.id },
      data: {
        status: 'dialing',
        assignedAgentId: agentId,
        dialedAt: new Date()
      },
      include: {
        contact: true,
        list: true
      }
    });

    // Update contact attempt count using contactId
    await prisma.contact.update({
      where: { contactId: queueEntry.contactId },
      data: {
        attemptCount: queueEntry.contact.attemptCount + 1,
        lastAttempt: new Date(),
        status: 'InProgress'
      }
    });

    // In a real system, this would trigger the actual SIP dial
    // For now, we simulate the dial operation
    console.log(`[DIAL SIMULATION] Agent ${agentId} dialing contact ${queueEntry.contact.phone} for campaign ${campaign.name}`);

    res.json({
      success: true,
      data: {
        queueEntry: updatedEntry,
        contact: queueEntry.contact,
        campaign: campaign,
        dialInitiated: true,
        message: `Successfully initiated dial to ${queueEntry.contact.phone}`
      }
    });

  } catch (error) {
    console.error('Error initiating dial for campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error initiating dial' }
    });
  }
});

// GET /api/admin/campaign-management/campaigns/:campaignId/queue
router.get('/campaigns/:campaignId/queue', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { status, limit = '50' } = req.query;

    // Build where clause for filtering
    const where: any = { campaignId };
    if (status) {
      where.status = status;
    }

    // Fetch queue entries with related contact and list data
    const queueEntries = await prisma.dialQueueEntry.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            contactId: true,
            firstName: true,
            lastName: true,
            fullName: true,
            phone: true,
            mobile: true,
            workPhone: true,
            homePhone: true,
            email: true,
            company: true,
            jobTitle: true,
            status: true,
            attemptCount: true,
            maxAttempts: true,
            lastOutcome: true,
            lastAttempt: true,
            nextAttempt: true,
            locked: true,
            lockedBy: true
          }
        },
        list: {
          select: {
            id: true,
            listId: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { queuedAt: 'asc' }
      ],
      take: parseInt(limit as string)
    });

    // Calculate queue statistics
    const stats = await prisma.dialQueueEntry.aggregate({
      where: { campaignId },
      _count: {
        id: true
      }
    });

    const statusBreakdown = await prisma.dialQueueEntry.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        queueEntries: queueEntries.map(entry => ({
          id: entry.id,
          queueId: entry.queueId,
          campaignId: entry.campaignId,
          contact: entry.contact,
          list: entry.list,
          status: entry.status,
          assignedAgentId: entry.assignedAgentId,
          priority: entry.priority,
          queuedAt: entry.queuedAt,
          dialedAt: entry.dialedAt,
          completedAt: entry.completedAt,
          outcome: entry.outcome,
          notes: entry.notes
        })),
        stats: {
          total: stats._count.id,
          statusBreakdown: statusBreakdown.reduce((acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching campaign queue:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch campaign queue' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:campaignId/queue/:queueId/call
router.post('/campaigns/:campaignId/queue/:queueId/call', async (req: Request, res: Response) => {
  try {
    const { campaignId, queueId } = req.params;
    const { agentId, agentNumber } = req.body;

    // Find the queue entry with contact details
    const queueEntry = await prisma.dialQueueEntry.findFirst({
      where: {
        queueId: queueId,
        campaignId: campaignId,
        status: 'queued'
      },
      include: {
        contact: true,
        list: true
      }
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Queue entry not found or already processed' }
      });
    }

    // Find the campaign to get CLI number
    const campaign = await prisma.campaign.findFirst({
      where: { campaignId: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Use campaign's outbound number or default
    const fromNumber = campaign.outboundNumber || '+442046343130';
    const toNumber = queueEntry.contact.phone;

    // Update queue entry to dialing status
    await prisma.dialQueueEntry.update({
      where: { id: queueEntry.id },
      data: {
        status: 'dialing',
        assignedAgentId: agentId,
        dialedAt: new Date()
      }
    });

    // Update contact attempt count
    await prisma.contact.update({
      where: { id: queueEntry.contact.id },
      data: {
        attemptCount: queueEntry.contact.attemptCount + 1,
        lastAttempt: new Date(),
        lastAgentId: agentId,
        locked: true,
        lockedBy: agentId,
        lockedAt: new Date()
      }
    });

    try {
      // Make the actual Twilio call
      const twilioCall = await createRestApiCall({
        to: toNumber,
        from: fromNumber,
        url: `${process.env.BACKEND_URL || 'https://superb-imagination-production.up.railway.app'}/api/calls-twiml/twiml-outbound?queueId=${queueId}&campaignId=${campaignId}`,
        agentNumber: agentNumber
      });

      // Create call record
      const callRecord = await prisma.callRecord.create({
        data: {
          callId: `call_${Date.now()}_${queueEntry.id}`,
          contactId: queueEntry.contact.contactId,
          campaignId: campaignId,
          agentId: agentId,
          phoneNumber: toNumber,
          callType: 'outbound',
          startTime: new Date(),
          outcome: 'initiated',
          notes: `Twilio call initiated via REST API - SID: ${Array.isArray(twilioCall) ? twilioCall[0]?.sid : twilioCall.sid}`
        }
      });

      res.json({
        success: true,
        data: {
          callRecord,
          queueEntry,
          contact: queueEntry.contact,
          twilioCallSid: Array.isArray(twilioCall) ? twilioCall[0]?.sid : twilioCall.sid,
          message: `Successfully initiated call to ${toNumber} from ${fromNumber}`
        }
      });

    } catch (twilioError) {
      // Revert queue entry status if Twilio call failed
      await prisma.dialQueueEntry.update({
        where: { id: queueEntry.id },
        data: {
          status: 'failed',
          outcome: 'twilio_error',
          completedAt: new Date(),
          notes: `Twilio error: ${twilioError}`
        }
      });

      // Unlock contact
      await prisma.contact.update({
        where: { id: queueEntry.contact.id },
        data: {
          locked: false,
          lockedBy: null,
          lockedAt: null,
          lastOutcome: 'failed'
        }
      });

      return res.status(500).json({
        success: false,
        error: { message: `Failed to initiate call: ${twilioError}` }
      });
    }

  } catch (error) {
    console.error('Error initiating manual call:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error initiating call' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:campaignId/auto-dial - Start auto-dialing for campaign
router.post('/campaigns/:campaignId/auto-dial', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { campaignId: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    if (campaign.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign must be active to start auto-dialing' }
      });
    }

    // Update campaign to AUTODIAL mode
    await prisma.campaign.update({
      where: { campaignId: campaignId },
      data: { dialMethod: 'AUTODIAL', status: 'RUNNING' }
    });

    // Get available contacts from existing queue entries or create from contact lists
    // For now, let's use existing contacts that are unlocked
    const availableContacts = await prisma.contact.findMany({
      where: {
        locked: false,
        OR: [
          { lastOutcome: null },
          { lastOutcome: { notIn: ['completed', 'answered'] } }
        ]
      },
      take: 10, // Limit initial batch size
      orderBy: { createdAt: 'asc' }
    });

    if (availableContacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No available contacts for auto-dialing' }
      });
    }

    // Create queue entries for auto-dialing
    const queueEntries = await Promise.all(
      availableContacts.map(async (contact) => {
        // Lock the contact
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            locked: true,
            lockedBy: 'AUTO_DIALER',
            lockedAt: new Date(),
            attemptCount: { increment: 1 }
          }
        });

        // Create queue entry
        return await prisma.dialQueueEntry.create({
          data: {
            queueId: `auto_${campaignId}_${contact.id}_${Date.now()}`,
            contactId: contact.contactId,
            campaignId: campaignId,
            listId: contact.listId,
            priority: 1,
            status: 'pending'
          }
        });
      })
    );

    console.log(`🚀 Auto-dialing started for campaign ${campaignId} with ${queueEntries.length} contacts`);

    // Start auto-dialing process (fire and forget)
    setTimeout(async () => {
      await processAutoDialQueue(campaignId);
    }, 1000);

    res.json({
      success: true,
      data: {
        campaignId,
        queuedContacts: queueEntries.length,
        status: 'AUTODIAL_STARTED',
        message: 'Auto-dialing started successfully'
      }
    });

  } catch (error) {
    console.error('Error starting auto-dial:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to start auto-dialing' }
    });
  }
});

// AUTO-DIALING PROCESS FUNCTION
async function processAutoDialQueue(campaignId: string) {
  console.log(`📞 Processing auto-dial queue for campaign ${campaignId}`);
  
  try {
    // Get campaign details first
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId: campaignId },
      select: {
        id: true,
        campaignId: true,
        outboundNumber: true,
        status: true
      }
    });

    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }

    // Get pending queue entries for this campaign
    const pendingEntries = await prisma.dialQueueEntry.findMany({
      where: {
        campaignId: campaignId,
        status: 'pending'
      },
      include: {
        contact: true
      },
      orderBy: { queuedAt: 'asc' },
      take: 5 // Process in batches
    });

    for (const queueEntry of pendingEntries) {
      try {
        // Update status to dialing
        await prisma.dialQueueEntry.update({
          where: { id: queueEntry.id },
          data: { status: 'dialing', dialedAt: new Date() }
        });

        // Make Twilio call - note: using correct field name 'phone' for Contact model
        const twilioCall = await createRestApiCall({
          to: queueEntry.contact.phone,
          from: campaign.outboundNumber || '+442046343130',
          url: `${process.env.BACKEND_URL || 'https://superb-imagination-production.up.railway.app'}/api/calls-twiml/twiml-outbound?queueId=${queueEntry.queueId}&campaignId=${campaignId}`,
        });

        // Create call record
        await prisma.callRecord.create({
          data: {
            callId: `auto_${Date.now()}_${queueEntry.id}`,
            contactId: queueEntry.contact.contactId,
            campaignId: campaignId,
            agentId: null, // No agent for auto-dial initially
            phoneNumber: queueEntry.contact.phone,
            callType: 'outbound',
            startTime: new Date(),
            outcome: 'initiated',
            notes: `Auto-dial initiated - SID: ${Array.isArray(twilioCall) ? twilioCall[0]?.sid : twilioCall.sid}`
          }
        });

        console.log(`📞 Auto-dial call initiated: ${queueEntry.contact.phone}`);
        
        // Wait between calls (pacing)
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

      } catch (callError) {
        console.error(`Error making auto-dial call for queue ${queueEntry.queueId}:`, callError);
        
        // Mark queue entry as failed
        await prisma.dialQueueEntry.update({
          where: { id: queueEntry.id },
          data: { status: 'failed', outcome: 'call_failed' }
        });

        // Unlock contact
        await prisma.contact.update({
          where: { id: queueEntry.contact.id },
          data: {
            locked: false,
            lockedBy: null,
            lockedAt: null,
            lastOutcome: 'failed'
          }
        });
      }
    }

    // Continue processing if there are more pending entries
    const remainingEntries = await prisma.dialQueueEntry.count({
      where: {
        campaignId: campaignId,
        status: 'pending'
      }
    });

    if (remainingEntries > 0) {
      // Schedule next batch
      setTimeout(async () => {
        await processAutoDialQueue(campaignId);
      }, 10000); // 10 second delay between batches
    } else {
      console.log(`✅ Auto-dial queue processing complete for campaign ${campaignId}`);
    }

  } catch (error) {
    console.error(`Error processing auto-dial queue for campaign ${campaignId}:`, error);
  }
}

export default router;