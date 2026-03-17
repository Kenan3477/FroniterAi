import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// Business settings interfaces
interface Organization {
  id: string;
  name: string;
  type: 'Enterprise' | 'SMB' | 'Startup' | 'Government';
  industry: string;
  size: string;
  status: 'Active' | 'Suspended' | 'Pending';
  contactCount: number;
  campaignCount: number;
  agentCount: number;
  createdAt: string;
  lastActivity: string;
  features: string[];
}

interface BusinessStats {
  organizations: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
  };
  agents: {
    total: number;
    online: number;
    available: number;
    onCall: number;
  };
  campaigns: {
    total: number;
    active: number;
    paused: number;
    completed: number;
  };
  calls: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalAnswered: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
}

// Mock organizations data
const mockOrganizations: Organization[] = [
  {
    id: 'org_001',
    name: 'Acme Corporation',
    type: 'Enterprise',
    industry: 'Technology',
    size: '1000+ employees',
    status: 'Active',
    contactCount: 15000,
    campaignCount: 12,
    agentCount: 45,
    createdAt: '2023-01-15T00:00:00Z',
    lastActivity: '2024-12-17T10:30:00Z',
    features: ['Advanced Analytics', 'Custom Integrations', 'Priority Support']
  },
  {
    id: 'org_002',
    name: 'Beta Solutions Ltd',
    type: 'SMB',
    industry: 'Finance',
    size: '100-500 employees',
    status: 'Active',
    contactCount: 3500,
    campaignCount: 6,
    agentCount: 12,
    createdAt: '2023-06-20T00:00:00Z',
    lastActivity: '2024-12-16T16:45:00Z',
    features: ['Standard Analytics', 'CRM Integration']
  },
  {
    id: 'org_003',
    name: 'Gamma Industries',
    type: 'Enterprise',
    industry: 'Manufacturing',
    size: '500-1000 employees',
    status: 'Active',
    contactCount: 8000,
    campaignCount: 8,
    agentCount: 25,
    createdAt: '2023-03-10T00:00:00Z',
    lastActivity: '2024-12-17T09:15:00Z',
    features: ['Advanced Analytics', 'API Access', 'Custom Reporting']
  },
  {
    id: 'org_004',
    name: 'Delta Startup Inc',
    type: 'Startup',
    industry: 'Healthcare',
    size: '10-50 employees',
    status: 'Pending',
    contactCount: 500,
    campaignCount: 2,
    agentCount: 3,
    createdAt: '2024-11-01T00:00:00Z',
    lastActivity: '2024-12-15T14:20:00Z',
    features: ['Basic Analytics']
  }
];

// Mock business stats
const mockStats: BusinessStats = {
  organizations: {
    total: 4,
    active: 3,
    suspended: 0,
    pending: 1
  },
  agents: {
    total: 85,
    online: 42,
    available: 15,
    onCall: 8
  },
  campaigns: {
    total: 28,
    active: 12,
    paused: 3,
    completed: 13
  },
  calls: {
    today: 347,
    thisWeek: 2156,
    thisMonth: 9874,
    totalAnswered: 6543
  },
  revenue: {
    thisMonth: 125000,
    lastMonth: 118000,
    growth: 5.93
  }
};

// GET /api/admin/business-settings/stats
router.get('/stats', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: mockStats
    });
  } catch (error) {
    console.error('Error getting business stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting business stats' }
    });
  }
});

// GET /api/admin/business-settings/organizations
router.get('/organizations', (req: Request, res: Response) => {
  try {
    const { status, type, industry, search, page, limit } = req.query;
    let filteredOrganizations = [...mockOrganizations];

    // Apply filters
    if (status) {
      filteredOrganizations = filteredOrganizations.filter(org => org.status === status);
    }
    if (type) {
      filteredOrganizations = filteredOrganizations.filter(org => org.type === type);
    }
    if (industry) {
      filteredOrganizations = filteredOrganizations.filter(org => org.industry === industry);
    }
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredOrganizations = filteredOrganizations.filter(org => 
        org.name.toLowerCase().includes(searchTerm) ||
        org.industry.toLowerCase().includes(searchTerm)
      );
    }

    // Pagination
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const offset = (pageNumber - 1) * limitNumber;
    const paginatedOrganizations = filteredOrganizations.slice(offset, offset + limitNumber);

    res.json({
      success: true,
      data: {
        organizations: paginatedOrganizations,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: filteredOrganizations.length,
          totalPages: Math.ceil(filteredOrganizations.length / limitNumber)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching organizations' }
    });
  }
});

// GET /api/admin/business-settings/organizations/:id
router.get('/organizations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const organization = mockOrganizations.find(org => org.id === id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' }
      });
    }

    res.json({
      success: true,
      data: {
        organization
      }
    });

  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching organization' }
    });
  }
});

// POST /api/admin/business-settings/organizations
router.post('/organizations', (req: Request, res: Response) => {
  try {
    const orgData = req.body;

    const newOrganization: Organization = {
      id: `org_${Date.now()}`,
      name: orgData.name,
      type: orgData.type,
      industry: orgData.industry,
      size: orgData.size,
      status: 'Pending',
      contactCount: 0,
      campaignCount: 0,
      agentCount: 0,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      features: orgData.features || ['Basic Analytics']
    };

    mockOrganizations.push(newOrganization);

    res.status(201).json({
      success: true,
      data: {
        organization: newOrganization,
        message: 'Organization created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error creating organization' }
    });
  }
});

// PUT /api/admin/business-settings/organizations/:id
router.put('/organizations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const orgIndex = mockOrganizations.findIndex(org => org.id === id);
    if (orgIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' }
      });
    }

    // Update organization
    mockOrganizations[orgIndex] = {
      ...mockOrganizations[orgIndex],
      ...updateData,
      lastActivity: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        organization: mockOrganizations[orgIndex],
        message: 'Organization updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error updating organization' }
    });
  }
});

// DELETE /api/admin/business-settings/organizations/:id
router.delete('/organizations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orgIndex = mockOrganizations.findIndex(org => org.id === id);
    if (orgIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' }
      });
    }

    const deletedOrganization = mockOrganizations.splice(orgIndex, 1)[0];

    res.json({
      success: true,
      data: {
        organization: deletedOrganization,
        message: 'Organization deleted successfully'
      }
    });

  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error deleting organization' }
    });
  }
});

// GET /api/admin/business-settings/system-health
router.get('/system-health', (req: Request, res: Response) => {
  try {
    const systemHealth = {
      overall: 'Healthy',
      services: {
        database: { status: 'Healthy', responseTime: 12 },
        redis: { status: 'Healthy', responseTime: 3 },
        twilio: { status: 'Healthy', responseTime: 45 },
        railway: { status: 'Healthy', uptime: 99.8 }
      },
      metrics: {
        cpuUsage: 23.5,
        memoryUsage: 67.2,
        diskUsage: 45.1,
        networkLatency: 15
      },
      lastChecked: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemHealth
    });

  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting system health' }
    });
  }
});

export default router;