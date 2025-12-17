import express from 'express';
import { Request, Response } from 'express';

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
  openingScript?: string;
  closingScript?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  isActive: boolean;
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

// Mock data for campaigns
let mockCampaigns: Campaign[] = [
  {
    id: 'campaign_001',
    name: 'Q4_Sales_Outreach',
    displayName: 'Q4 Sales Outreach Campaign',
    description: 'End-of-year sales push targeting enterprise clients',
    status: 'ACTIVE',
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
    startDate: '2024-10-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    targetLeads: 1000,
    targetCompletions: 200,
    expectedDuration: 90,
    openingScript: 'Hi, this is calling from [Company] regarding your interest in our enterprise solutions.',
    closingScript: 'Thank you for your time. We\'ll follow up with the information discussed.',
    isActive: true,
    createdAt: '2024-09-15T10:00:00Z',
    updatedAt: '2024-11-20T14:30:00Z',
    createdBy: {
      id: 'user_001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com'
    },
    assignedAgents: [
      { id: 'agent_001', name: 'John Smith', email: 'john.smith@company.com' },
      { id: 'agent_002', name: 'Emily Davis', email: 'emily.davis@company.com' }
    ],
    dataLists: [
      { id: 'list_001', name: 'Enterprise Prospects Q4', recordCount: 350 },
      { id: 'list_002', name: 'Warm Leads October', recordCount: 150 }
    ],
    _count: {
      interactions: 847,
      contacts: 500,
      completedCalls: 342
    }
  },
  {
    id: 'campaign_002',
    name: 'Customer_Satisfaction_Survey',
    displayName: 'Customer Satisfaction Survey',
    description: 'Quarterly satisfaction survey for existing customers',
    status: 'ACTIVE',
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
    startDate: '2024-11-01T00:00:00Z',
    endDate: '2024-11-30T23:59:59Z',
    targetLeads: 500,
    targetCompletions: 400,
    expectedDuration: 30,
    openingScript: 'Hello, we\'re conducting a brief customer satisfaction survey.',
    isActive: true,
    createdAt: '2024-10-20T09:00:00Z',
    updatedAt: '2024-11-15T11:00:00Z',
    createdBy: {
      id: 'user_002',
      name: 'Mike Wilson',
      email: 'mike.wilson@company.com'
    },
    assignedAgents: [
      { id: 'agent_003', name: 'Lisa Chen', email: 'lisa.chen@company.com' }
    ],
    dataLists: [
      { id: 'list_003', name: 'Existing Customers 2024', recordCount: 500 }
    ],
    _count: {
      interactions: 234,
      contacts: 200,
      completedCalls: 156
    }
  },
  {
    id: 'campaign_test',
    name: 'Test_Campaign',
    displayName: 'Test Campaign for Development',
    description: 'Development testing campaign',
    status: 'DRAFT',
    category: 'SALES',
    type: 'OUTBOUND',
    dialingMode: 'MANUAL',
    maxCallsPerAgent: 10,
    maxAttemptsPerRecord: 3,
    abandonRateThreshold: 5,
    pacingMultiplier: 1.0,
    defaultTimezone: 'Europe/London',
    startDate: '2024-12-01T00:00:00Z',
    targetLeads: 50,
    targetCompletions: 10,
    expectedDuration: 7,
    isActive: true,
    createdAt: '2024-12-17T00:00:00Z',
    updatedAt: '2024-12-17T00:00:00Z',
    assignedAgents: [],
    dataLists: [
      { id: 'list_001', name: 'Test Contacts', recordCount: 5 }
    ],
    _count: {
      interactions: 0,
      contacts: 5,
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
router.get('/campaigns', (req: Request, res: Response) => {
  try {
    const { status, category, type, search, page, limit } = req.query;
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
      openingScript: campaignData.openingScript,
      closingScript: campaignData.closingScript,
      emailTemplate: campaignData.emailTemplate,
      smsTemplate: campaignData.smsTemplate,
      isActive: true,
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

export default router;