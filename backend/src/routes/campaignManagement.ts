import express from 'express';
import { Request, Response } from 'express';
import { campaignEvents, agentEvents, queueEvents } from '../utils/eventHelpers';

const router = express.Router();

// Campaign interface
interface Campaign {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  category: 'SALES' | 'MARKETING' | 'SUPPORT' | 'SURVEYS' | 'COLLECTIONS' | 'NURTURE';
  type: 'OUTBOUND' | 'INBOUND' | 'BLENDED' | 'EMAIL' | 'SMS' | 'MULTICHANNEL';
  dialingMode: 'PREDICTIVE' | 'PROGRESSIVE' | 'PREVIEW' | 'MANUAL';
  maxCallsPerAgent: number;
  maxAttemptsPerRecord: number;
  abandonRateThreshold: number;
  pacingMultiplier: number;
  defaultTimezone: string;
  dialingStart?: string;
  dialingEnd?: string;
  startDate: string;
  endDate?: string;
  targetLeads: number;
  targetCompletions: number;
  expectedDuration: number;
  // Frontend display properties
  totalTargets: number;
  totalCalls: number;
  totalConnections: number;
  totalConversions: number;
  totalRevenue: number;
  budget?: number;
  budgetCurrency: string;
  priority: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  scheduledStart?: string;
  scheduledEnd?: string;
  openingScript?: string;
  closingScript?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  isActive: boolean;
  // Dial Queue Properties
  dialMethod: 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP';
  dialSpeed: number; // Calls per minute for autodial
  agentCount: number; // Number of agents assigned to this campaign
  queuePosition?: number; // Position in dial queue
  predictiveDialingEnabled: boolean;
  maxConcurrentCalls: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  assignedAgents: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  dataLists: Array<{
    id: string;
    name: string;
    recordCount: number;
  }>;
  _count?: {
    interactions: number;
    contacts: number;
    completedCalls: number;
  };
}

// Campaign Template interface
interface CampaignTemplate {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'SALES' | 'MARKETING' | 'SUPPORT' | 'SURVEYS' | 'COLLECTIONS' | 'NURTURE';
  type: 'OUTBOUND' | 'INBOUND' | 'BLENDED' | 'EMAIL' | 'SMS' | 'MULTICHANNEL';
  dialingMode: 'PREDICTIVE' | 'PROGRESSIVE' | 'PREVIEW' | 'MANUAL';
  maxCallsPerAgent: number;
  maxAttemptsPerRecord: number;
  abandonRateThreshold: number;
  pacingMultiplier: number;
  defaultTimezone: string;
  dialingStart?: string;
  dialingEnd?: string;
  openingScript?: string;
  closingScript?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    campaigns: number;
  };
}

// Mock data for campaigns - REMOVED ALL MOCK CAMPAIGNS
let mockCampaigns: Campaign[] = [
  {
    id: 'campaign_001',
    name: 'Q4_Sales_Outreach',
    displayName: 'Q4 Sales Outreach Campaign', 
    description: 'Q4 sales outreach campaign for lead generation',
    status: 'ACTIVE',
    category: 'SALES',
    type: 'OUTBOUND',
    dialingMode: 'PROGRESSIVE',
    maxCallsPerAgent: 50,
    maxAttemptsPerRecord: 3,
    abandonRateThreshold: 5,
    pacingMultiplier: 1.0,
    defaultTimezone: 'Europe/London',
    startDate: new Date().toISOString(),
    targetLeads: 1000,
    targetCompletions: 100,
    expectedDuration: 30,
    // Frontend display properties
    totalTargets: 1000,
    totalCalls: 0,
    totalConnections: 0,
    totalConversions: 0,
    totalRevenue: 0,
    budget: 10000,
    budgetCurrency: 'USD',
    priority: 1,
    approvalStatus: 'APPROVED',
    scheduledStart: new Date().toISOString(),
    scheduledEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    openingScript: 'Hello, this is a call from our sales team...',
    closingScript: 'Thank you for your time!',
    emailTemplate: 'Follow-up email template',
    smsTemplate: 'SMS follow-up template',
    isActive: true,
    // Dial Queue Properties
    dialMethod: 'MANUAL_DIAL',
    dialSpeed: 60,
    agentCount: 0,
    predictiveDialingEnabled: false,
    maxConcurrentCalls: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedAgents: [],
    dataLists: [],
    _count: {
      interactions: 0,
      contacts: 0,
      completedCalls: 0
    }
  },
  {
    id: 'campaign_002',
    name: 'Customer_Satisfaction_Survey',
    displayName: 'Customer Satisfaction Survey',
    description: 'Customer satisfaction survey campaign',
    status: 'ACTIVE',
    category: 'SURVEYS',
    type: 'OUTBOUND', 
    dialingMode: 'PREVIEW',
    maxCallsPerAgent: 30,
    maxAttemptsPerRecord: 2,
    abandonRateThreshold: 3,
    pacingMultiplier: 1.0,
    defaultTimezone: 'Europe/London',
    startDate: new Date().toISOString(),
    targetLeads: 500,
    targetCompletions: 200,
    expectedDuration: 20,
    // Frontend display properties
    totalTargets: 500,
    totalCalls: 0,
    totalConnections: 0,
    totalConversions: 0,
    totalRevenue: 0,
    budget: 5000,
    budgetCurrency: 'USD',
    priority: 2,
    approvalStatus: 'APPROVED',
    scheduledStart: new Date().toISOString(),
    scheduledEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    openingScript: 'Hello, we would like to get your feedback...',
    closingScript: 'Thank you for participating in our survey!',
    emailTemplate: 'Survey follow-up email template',
    smsTemplate: 'Survey reminder SMS template',
    isActive: true,
    // Dial Queue Properties  
    dialMethod: 'MANUAL_DIAL',
    dialSpeed: 60,
    agentCount: 0,
    predictiveDialingEnabled: false,
    maxConcurrentCalls: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedAgents: [],
    dataLists: [],
    _count: {
      interactions: 0,
      contacts: 0,
      completedCalls: 0
    }
  }
];

// Mock data for templates
let mockTemplates: CampaignTemplate[] = [
  {
    id: 'template_001',
    name: 'SALES_OUTBOUND_PROGRESSIVE',
    displayName: 'Sales Outbound - Progressive',
    description: 'Standard template for outbound sales campaigns with progressive dialing',
    category: 'SALES',
    type: 'OUTBOUND',
    dialingMode: 'PROGRESSIVE',
    maxCallsPerAgent: 50,
    maxAttemptsPerRecord: 3,
    abandonRateThreshold: 5,
    pacingMultiplier: 1.2,
    defaultTimezone: 'Europe/London',
    dialingStart: '09:00',
    dialingEnd: '17:00',
    openingScript: 'Hi, this is [Agent Name] calling from [Company]. Is this a good time to talk?',
    closingScript: 'Thank you for your time today. Have a great day!',
    usageCount: 15,
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    createdBy: {
      id: 'user_001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com'
    },
    _count: {
      campaigns: 15
    }
  },
  {
    id: 'template_002',
    name: 'CUSTOMER_SURVEY_PREVIEW',
    displayName: 'Customer Survey - Preview',
    description: 'Template for customer satisfaction surveys with preview dialing',
    category: 'SURVEYS',
    type: 'OUTBOUND',
    dialingMode: 'PREVIEW',
    maxCallsPerAgent: 30,
    maxAttemptsPerRecord: 2,
    abandonRateThreshold: 3,
    pacingMultiplier: 1.0,
    defaultTimezone: 'Europe/London',
    dialingStart: '10:00',
    dialingEnd: '16:00',
    openingScript: 'Hello, we\'re conducting a brief satisfaction survey. Do you have 5 minutes?',
    closingScript: 'Thank you for participating in our survey. Your feedback is valuable to us.',
    usageCount: 8,
    isActive: true,
    createdAt: '2024-02-20T00:00:00Z',
    createdBy: {
      id: 'user_002',
      name: 'Mike Wilson',
      email: 'mike.wilson@company.com'
    },
    _count: {
      campaigns: 8
    }
  }
];

// GET /api/admin/campaign-management/campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const { status, category, type, search, page, limit } = req.query;
    
    // Return the empty mockCampaigns array (no campaigns until user creates them)
    let filteredCampaigns = [...mockCampaigns];

    // Apply filters
    if (status) {
      filteredCampaigns = filteredCampaigns.filter(c => c.status === status);
    }
    if (category) {
      filteredCampaigns = filteredCampaigns.filter(c => c.category === category);
    }
    if (type) {
      filteredCampaigns = filteredCampaigns.filter(c => c.type === type);
    }
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredCampaigns = filteredCampaigns.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.displayName.toLowerCase().includes(searchTerm) ||
        (c.description && c.description.toLowerCase().includes(searchTerm))
      );
    }

    // Pagination
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const offset = (pageNumber - 1) * limitNumber;
    const paginatedCampaigns = filteredCampaigns.slice(offset, offset + limitNumber);

    res.json({
      success: true,
      data: {
        campaigns: paginatedCampaigns,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: filteredCampaigns.length,
          totalPages: Math.ceil(filteredCampaigns.length / limitNumber)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching campaigns' }
    });
  }
});

// GET /api/admin/campaign-management/templates
router.get('/templates', (req: Request, res: Response) => {
  try {
    const { category, type, search } = req.query;
    let filteredTemplates = [...mockTemplates];

    // Apply filters
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }
    if (type) {
      filteredTemplates = filteredTemplates.filter(t => t.type === type);
    }
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchTerm) ||
        t.displayName.toLowerCase().includes(searchTerm) ||
        (t.description && t.description.toLowerCase().includes(searchTerm))
      );
    }

    res.json({
      success: true,
      data: {
        templates: filteredTemplates
      }
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching templates' }
    });
  }
});

// GET /api/admin/campaign-management/stats
router.get('/stats', (req: Request, res: Response) => {
  try {
    const activeCampaigns = mockCampaigns.filter(c => c.status === 'ACTIVE');
    const totalInteractions = mockCampaigns.reduce((sum, c) => sum + (c._count?.interactions || 0), 0);
    const totalContacts = mockCampaigns.reduce((sum, c) => sum + (c._count?.contacts || 0), 0);
    const totalCompletedCalls = mockCampaigns.reduce((sum, c) => sum + (c._count?.completedCalls || 0), 0);

    const stats = {
      totalCampaigns: mockCampaigns.length,
      activeCampaigns: activeCampaigns.length,
      draftCampaigns: mockCampaigns.filter(c => c.status === 'DRAFT').length,
      pausedCampaigns: mockCampaigns.filter(c => c.status === 'PAUSED').length,
      completedCampaigns: mockCampaigns.filter(c => c.status === 'COMPLETED').length,
      totalTemplates: mockTemplates.length,
      totalInteractions,
      totalContacts,
      totalCompletedCalls,
      conversionRate: totalContacts > 0 ? (totalCompletedCalls / totalContacts * 100).toFixed(2) : '0.00',
      averageCallsPerCampaign: mockCampaigns.length > 0 ? (totalCompletedCalls / mockCampaigns.length).toFixed(1) : '0.0'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting stats' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns
router.post('/campaigns', (req: Request, res: Response) => {
  try {
    const campaignData = req.body;

    const newCampaign: Campaign = {
      id: `campaign_${Date.now()}`,
      name: campaignData.name,
      displayName: campaignData.displayName,
      description: campaignData.description,
      status: 'DRAFT',
      category: campaignData.category,
      type: campaignData.type,
      dialingMode: campaignData.dialingMode,
      maxCallsPerAgent: campaignData.maxCallsPerAgent || 50,
      maxAttemptsPerRecord: campaignData.maxAttemptsPerRecord || 3,
      abandonRateThreshold: campaignData.abandonRateThreshold || 5,
      pacingMultiplier: campaignData.pacingMultiplier || 1.0,
      defaultTimezone: campaignData.defaultTimezone || 'Europe/London',
      dialingStart: campaignData.dialingStart,
      dialingEnd: campaignData.dialingEnd,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      targetLeads: campaignData.targetLeads || 0,
      targetCompletions: campaignData.targetCompletions || 0,
      expectedDuration: campaignData.expectedDuration || 30,
      // Frontend display properties
      totalTargets: campaignData.totalTargets || campaignData.targetLeads || 0,
      totalCalls: 0,
      totalConnections: 0,
      totalConversions: 0,
      totalRevenue: 0,
      budget: campaignData.budget,
      budgetCurrency: campaignData.budgetCurrency || 'USD',
      priority: campaignData.priority || 1,
      approvalStatus: campaignData.approvalStatus || 'PENDING',
      scheduledStart: campaignData.scheduledStart,
      scheduledEnd: campaignData.scheduledEnd,
      openingScript: campaignData.openingScript,
      closingScript: campaignData.closingScript,
      emailTemplate: campaignData.emailTemplate,
      smsTemplate: campaignData.smsTemplate,
      isActive: true,
      // Dial Queue Properties
      dialMethod: campaignData.dialMethod || 'MANUAL_DIAL',
      dialSpeed: campaignData.dialSpeed || 60,
      agentCount: 0,
      predictiveDialingEnabled: campaignData.predictiveDialingEnabled || false,
      maxConcurrentCalls: campaignData.maxConcurrentCalls || 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedAgents: [],
      dataLists: [],
      _count: {
        interactions: 0,
        contacts: 0,
        completedCalls: 0
      }
    };

    mockCampaigns.push(newCampaign);

    res.status(201).json({
      success: true,
      data: {
        campaign: newCampaign,
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
router.put('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const campaignIndex = mockCampaigns.findIndex(c => c.id === id);
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Update campaign
    mockCampaigns[campaignIndex] = {
      ...mockCampaigns[campaignIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        campaign: mockCampaigns[campaignIndex],
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
router.delete('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaignIndex = mockCampaigns.findIndex(c => c.id === id);
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const deletedCampaign = mockCampaigns.splice(campaignIndex, 1)[0];

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

// DIAL QUEUE API ENDPOINTS

// PATCH /api/admin/campaign-management/campaigns/:id/dial-method
router.patch('/campaigns/:id/dial-method', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dialMethod } = req.body;

    const campaign = mockCampaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const previousDialMethod = campaign.dialMethod;
    campaign.dialMethod = dialMethod;
    campaign.updatedAt = new Date().toISOString();

    // Emit campaign dial method change event
    await campaignEvents.dialMethodChanged({
      campaignId: campaign.id,
      campaignName: campaign.displayName,
      dialMethod,
      previousState: { dialMethod: previousDialMethod },
    });

    res.json({
      success: true,
      data: { campaign, message: 'Dial method updated successfully' }
    });

  } catch (error) {
    console.error('Error updating dial method:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error updating dial method' }
    });
  }
});

// PATCH /api/admin/campaign-management/campaigns/:id/activate
router.patch('/campaigns/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const campaign = mockCampaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const previousStatus = campaign.status;
    const previousActive = campaign.isActive;
    
    campaign.isActive = isActive;
    campaign.updatedAt = new Date().toISOString();

    // Update campaign status based on activation
    if (isActive && campaign.status === 'PAUSED') {
      campaign.status = 'ACTIVE';
    } else if (!isActive && campaign.status === 'ACTIVE') {
      campaign.status = 'PAUSED';
    }

    // Emit appropriate campaign event
    if (isActive && previousStatus === 'PAUSED') {
      await campaignEvents.started({
        campaignId: campaign.id,
        campaignName: campaign.displayName,
        status: campaign.status,
        agentCount: campaign.agentCount,
        dialMethod: campaign.dialMethod,
      });
    } else if (!isActive && previousStatus === 'ACTIVE') {
      await campaignEvents.paused({
        campaignId: campaign.id,
        campaignName: campaign.displayName,
        status: campaign.status,
        agentCount: campaign.agentCount,
      });
    } else {
      await campaignEvents.updated({
        campaignId: campaign.id,
        campaignName: campaign.displayName,
        status: campaign.status,
        previousState: { 
          isActive: previousActive, 
          status: previousStatus 
        },
      });
    }

    res.json({
      success: true,
      data: { campaign, message: `Campaign ${isActive ? 'activated' : 'deactivated'} successfully` }
    });

  } catch (error) {
    console.error('Error toggling campaign activation:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error toggling campaign activation' }
    });
  }
});

// PATCH /api/admin/campaign-management/campaigns/:id/dial-speed
router.patch('/campaigns/:id/dial-speed', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dialSpeed } = req.body;

    const campaign = mockCampaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Validate dial speed (1-300 calls per minute)
    if (dialSpeed < 1 || dialSpeed > 300) {
      return res.status(400).json({
        success: false,
        error: { message: 'Dial speed must be between 1 and 300 calls per minute' }
      });
    }

    const previousDialSpeed = campaign.dialSpeed;
    campaign.dialSpeed = dialSpeed;
    campaign.updatedAt = new Date().toISOString();

    // Emit campaign dial speed change event
    await campaignEvents.dialSpeedChanged({
      campaignId: campaign.id,
      campaignName: campaign.displayName,
      dialSpeed,
      previousState: { dialSpeed: previousDialSpeed },
    });

    res.json({
      success: true,
      data: { campaign, message: 'Dial speed updated successfully' }
    });

  } catch (error) {
    console.error('Error updating dial speed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error updating dial speed' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:id/join-agent
router.post('/campaigns/:id/join-agent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId, agentName, agentEmail } = req.body;

    const campaign = mockCampaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Check if agent is already assigned
    const existingAgent = campaign.assignedAgents.find(agent => 
      agent.id === agentId || agent.email === agentEmail
    );

    if (existingAgent) {
      return res.status(400).json({
        success: false,
        error: { message: 'Agent is already assigned to this campaign' }
      });
    }

    // Add agent to campaign
    const newAgent = {
      id: agentId || `agent_${Date.now()}`,
      name: agentName || 'Unknown Agent',
      email: agentEmail || ''
    };

    campaign.assignedAgents.push(newAgent);
    campaign.agentCount = campaign.assignedAgents.length;
    campaign.updatedAt = new Date().toISOString();

    // Emit agent joined campaign event
    await agentEvents.joinedCampaign({
      agentId: newAgent.id,
      agentName: newAgent.name,
      campaignId: campaign.id,
      campaignName: campaign.displayName,
    });

    res.json({
      success: true,
      data: { 
        campaign, 
        agent: newAgent,
        message: 'Agent joined campaign successfully' 
      }
    });

  } catch (error) {
    console.error('Error adding agent to campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error adding agent to campaign' }
    });
  }
});

// POST /api/admin/campaign-management/campaigns/:id/leave-agent
router.post('/campaigns/:id/leave-agent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    const campaign = mockCampaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // If no specific agent ID provided, remove the most recently added agent
    let agentIndex = -1;
    if (agentId) {
      agentIndex = campaign.assignedAgents.findIndex(agent => agent.id === agentId);
    } else {
      agentIndex = campaign.assignedAgents.length - 1;
    }

    if (agentIndex === -1 || campaign.assignedAgents.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No agents to remove from this campaign' }
      });
    }

    // Remove agent from campaign
    const removedAgent = campaign.assignedAgents.splice(agentIndex, 1)[0];
    campaign.agentCount = campaign.assignedAgents.length;
    campaign.updatedAt = new Date().toISOString();

    // Emit agent left campaign event
    await agentEvents.leftCampaign({
      agentId: removedAgent.id,
      agentName: removedAgent.name,
      campaignId: campaign.id,
      campaignName: campaign.displayName,
    });

    res.json({
      success: true,
      data: { 
        campaign, 
        removedAgent,
        message: 'Agent removed from campaign successfully' 
      }
    });

  } catch (error) {
    console.error('Error removing agent from campaign:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error removing agent from campaign' }
    });
  }
});

export default router;