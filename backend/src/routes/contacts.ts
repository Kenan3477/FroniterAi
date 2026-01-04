import express from 'express';
import { Request, Response } from 'express';
import { prisma } from '../database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Contact interface matching the dial queue system
interface Contact {
  contactId: string;
  listId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: 'NotAttempted' | 'Answered' | 'NoAnswer' | 'Busy' | 'Voicemail' | 'RetryEligible' | 'MaxAttempts' | 'DoNotCall' | 'Invalid';
  attemptCount: number;
  maxAttempts: number;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Get contacts
// GET /api/contacts?campaignId=xxx&status=xxx&limit=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaignId, status, limit, page, search } = req.query;
    
    // Build where clause for filtering
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filter by campaign through data list relationships
    if (campaignId) {
      // Get data lists associated with the campaign
      const campaign = await prisma.campaign.findUnique({
        where: { campaignId: campaignId as string },
        include: {
          // Note: This assumes campaign-datalist relationship exists
          // If not implemented yet, we'll need to create it
        }
      });
      
      // For now, get all contacts if campaign filter is applied
      // This will be enhanced when campaign-datalist relationships are implemented
    }

    // Pagination
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = Math.min(parseInt(limit as string) || 50, 1000); // Cap at 1000
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch contacts from database
    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          list: {
            select: {
              listId: true,
              name: true
            }
          }
        }
      }),
      prisma.contact.count({ where })
    ]);

    // Transform database records to match interface
    const transformedContacts = contacts.map(contact => ({
      contactId: contact.contactId,
      listId: contact.listId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email || undefined,
      status: contact.status,
      attemptCount: contact.attemptCount,
      maxAttempts: contact.maxAttempts,
      locked: contact.locked,
      lockedBy: contact.lockedBy || undefined,
      lockedAt: contact.lockedAt || undefined,
      lastAttemptAt: contact.lastAttempt || undefined,
      nextRetryAt: contact.nextAttempt || undefined,
      customFields: {
        company: contact.company,
        jobTitle: contact.jobTitle,
        industry: contact.industry,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zipCode: contact.zipCode,
        country: contact.country,
        notes: contact.notes,
        tags: contact.tags,
        leadSource: contact.leadSource,
        leadScore: contact.leadScore,
        custom1: contact.custom1,
        custom2: contact.custom2,
        custom3: contact.custom3,
        custom4: contact.custom4,
        custom5: contact.custom5
      },
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }));

    res.json({
      success: true,
      data: {
        contacts: transformedContacts,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNumber)
        },
        filters: {
          campaignId: campaignId || null,
          status: status || null,
          search: search || null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching contacts' }
    });
  }
});

// Get contact statistics
// GET /api/contacts/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;

    // Build where clause for filtering
    let where: any = {};

    // Filter by campaign through data list relationships
    if (campaignId) {
      // Get data lists associated with the campaign
      const campaign = await prisma.campaign.findUnique({
        where: { campaignId: campaignId as string }
      });
      
      if (campaign) {
        // For now, get all contacts since campaign-datalist relationship needs implementation
        // This will be enhanced when campaign-datalist relationships are implemented
      }
    }

    // Get status counts using database aggregation
    const [
      totalCount,
      statusCounts,
      lockedCount,
      dialableCount
    ] = await Promise.all([
      // Total contacts
      prisma.contact.count({ where }),
      
      // Status breakdown
      prisma.contact.groupBy({
        by: ['status'],
        where,
        _count: {
          contactId: true
        }
      }),
      
      // Locked contacts
      prisma.contact.count({
        where: {
          ...where,
          locked: true
        }
      }),
      
      // Dialable contacts (not locked, not maxed out, retry time passed)
      prisma.contact.count({
        where: {
          ...where,
          locked: false,
          status: {
            notIn: ['MaxAttempts', 'DoNotCall', 'Invalid']
          },
          AND: [
            {
              OR: [
                {
                  nextAttempt: null
                },
                {
                  nextAttempt: {
                    lte: new Date()
                  }
                }
              ]
            }
          ]
        }
      })
    ]);

    // Transform status counts to expected format
    const statusCountMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.contactId;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      total: totalCount,
      byStatus: {
        NotAttempted: statusCountMap['NotAttempted'] || 0,
        Answered: statusCountMap['Answered'] || 0,
        NoAnswer: statusCountMap['NoAnswer'] || 0,
        Busy: statusCountMap['Busy'] || 0,
        Voicemail: statusCountMap['Voicemail'] || 0,
        RetryEligible: statusCountMap['RetryEligible'] || 0,
        MaxAttempts: statusCountMap['MaxAttempts'] || 0,
        DoNotCall: statusCountMap['DoNotCall'] || 0,
        Invalid: statusCountMap['Invalid'] || 0
      },
      dialable: dialableCount,
      locked: lockedCount,
      campaignId: campaignId || null
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting contact stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting contact stats' }
    });
  }
});

// Get specific contact by ID
// GET /api/contacts/:contactId
router.get('/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { contactId },
      include: {
        list: {
          select: {
            listId: true,
            name: true
          }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contact not found' }
      });
    }

    // Transform database record to match interface
    const transformedContact = {
      contactId: contact.contactId,
      listId: contact.listId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email || undefined,
      status: contact.status,
      attemptCount: contact.attemptCount,
      maxAttempts: contact.maxAttempts,
      locked: contact.locked,
      lockedBy: contact.lockedBy || undefined,
      lockedAt: contact.lockedAt || undefined,
      lastAttemptAt: contact.lastAttempt || undefined,
      nextRetryAt: contact.nextAttempt || undefined,
      customFields: {
        company: contact.company,
        jobTitle: contact.jobTitle,
        industry: contact.industry,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zipCode: contact.zipCode,
        country: contact.country,
        notes: contact.notes,
        tags: contact.tags,
        leadSource: contact.leadSource,
        leadScore: contact.leadScore,
        custom1: contact.custom1,
        custom2: contact.custom2,
        custom3: contact.custom3,
        custom4: contact.custom4,
        custom5: contact.custom5
      },
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    };

    res.json({
      success: true,
      data: {
        contact: transformedContact
      }
    });

  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error fetching contact' }
    });
  }
});

// Update contact status
// PUT /api/contacts/:contactId/status
router.put('/:contactId/status', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { status, notes, outcome } = req.body;

    const contact = await prisma.contact.findUnique({
      where: { contactId }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contact not found' }
      });
    }

    const updateData: any = {
      status,
      lastAttempt: new Date(),
      attemptCount: contact.attemptCount + 1,
      updatedAt: new Date()
    };

    // Update notes if provided
    if (notes) {
      updateData.notes = notes;
    }

    // Set retry time based on status
    if (status === 'NoAnswer' && contact.attemptCount + 1 < contact.maxAttempts) {
      updateData.status = 'RetryEligible';
      updateData.nextAttempt = new Date(Date.now() + 300000); // 5 minutes
    } else if (status === 'Busy' && contact.attemptCount + 1 < contact.maxAttempts) {
      updateData.nextAttempt = new Date(Date.now() + 180000); // 3 minutes
    } else if (contact.attemptCount + 1 >= contact.maxAttempts) {
      updateData.status = 'MaxAttempts';
    }

    // Unlock contact
    updateData.locked = false;
    updateData.lockedBy = null;
    updateData.lockedAt = null;

    const updatedContact = await prisma.contact.update({
      where: { contactId },
      data: updateData,
      include: {
        list: {
          select: {
            listId: true,
            name: true
          }
        }
      }
    });

    // Transform database record to match interface
    const transformedContact = {
      contactId: updatedContact.contactId,
      listId: updatedContact.listId,
      firstName: updatedContact.firstName,
      lastName: updatedContact.lastName,
      phone: updatedContact.phone,
      email: updatedContact.email || undefined,
      status: updatedContact.status,
      attemptCount: updatedContact.attemptCount,
      maxAttempts: updatedContact.maxAttempts,
      locked: updatedContact.locked,
      lockedBy: updatedContact.lockedBy || undefined,
      lockedAt: updatedContact.lockedAt || undefined,
      lastAttemptAt: updatedContact.lastAttempt || undefined,
      nextRetryAt: updatedContact.nextAttempt || undefined,
      customFields: {
        company: updatedContact.company,
        jobTitle: updatedContact.jobTitle,
        industry: updatedContact.industry,
        address: updatedContact.address,
        city: updatedContact.city,
        state: updatedContact.state,
        zipCode: updatedContact.zipCode,
        country: updatedContact.country,
        notes: updatedContact.notes,
        tags: updatedContact.tags,
        leadSource: updatedContact.leadSource,
        leadScore: updatedContact.leadScore,
        custom1: updatedContact.custom1,
        custom2: updatedContact.custom2,
        custom3: updatedContact.custom3,
        custom4: updatedContact.custom4,
        custom5: updatedContact.custom5
      },
      createdAt: updatedContact.createdAt,
      updatedAt: updatedContact.updatedAt
    };

    res.json({
      success: true,
      data: {
        contact: transformedContact,
        message: `Contact status updated to ${status}`
      }
    });

  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error updating contact' }
    });
  }
});

// Create new contact
// POST /api/contacts
router.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, listId, customFields } = req.body;

    if (!firstName || !lastName || !phone || !listId) {
      return res.status(400).json({
        success: false,
        error: { message: 'firstName, lastName, phone, and listId are required' }
      });
    }

    // Verify list exists
    const list = await prisma.dataList.findUnique({
      where: { listId }
    });

    if (!list) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid listId - data list does not exist' }
      });
    }

    const contactData = {
      contactId: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      listId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone,
      email: email || null,
      status: 'NotAttempted',
      attemptCount: 0,
      maxAttempts: 3,
      locked: false,
      company: customFields?.company || null,
      jobTitle: customFields?.jobTitle || null,
      industry: customFields?.industry || null,
      address: customFields?.address || null,
      city: customFields?.city || null,
      state: customFields?.state || null,
      zipCode: customFields?.zipCode || null,
      country: customFields?.country || null,
      notes: customFields?.notes || null,
      tags: customFields?.tags || null,
      leadSource: customFields?.leadSource || null,
      leadScore: customFields?.leadScore || 0,
      custom1: customFields?.custom1 || null,
      custom2: customFields?.custom2 || null,
      custom3: customFields?.custom3 || null,
      custom4: customFields?.custom4 || null,
      custom5: customFields?.custom5 || null
    };

    const newContact = await prisma.contact.create({
      data: contactData,
      include: {
        list: {
          select: {
            listId: true,
            name: true
          }
        }
      }
    });

    // Update list total contacts count
    await prisma.dataList.update({
      where: { listId },
      data: {
        totalContacts: {
          increment: 1
        }
      }
    });

    // Transform database record to match interface
    const transformedContact = {
      contactId: newContact.contactId,
      listId: newContact.listId,
      firstName: newContact.firstName,
      lastName: newContact.lastName,
      phone: newContact.phone,
      email: newContact.email || undefined,
      status: newContact.status,
      attemptCount: newContact.attemptCount,
      maxAttempts: newContact.maxAttempts,
      locked: newContact.locked,
      lockedBy: newContact.lockedBy || undefined,
      lockedAt: newContact.lockedAt || undefined,
      lastAttemptAt: newContact.lastAttempt || undefined,
      nextRetryAt: newContact.nextAttempt || undefined,
      customFields: {
        company: newContact.company,
        jobTitle: newContact.jobTitle,
        industry: newContact.industry,
        address: newContact.address,
        city: newContact.city,
        state: newContact.state,
        zipCode: newContact.zipCode,
        country: newContact.country,
        notes: newContact.notes,
        tags: newContact.tags,
        leadSource: newContact.leadSource,
        leadScore: newContact.leadScore,
        custom1: newContact.custom1,
        custom2: newContact.custom2,
        custom3: newContact.custom3,
        custom4: newContact.custom4,
        custom5: newContact.custom5
      },
      createdAt: newContact.createdAt,
      updatedAt: newContact.updatedAt
    };

    res.status(201).json({
      success: true,
      data: {
        contact: transformedContact,
        message: 'Contact created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error creating contact' }
    });
  }
});

export default router;
