import express from 'express';
import { Request, Response } from 'express';

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

// Mock contact data (in production this would be database queries)
let mockContacts: Contact[] = [
  {
    contactId: 'contact_001',
    listId: 'list_001',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+447700123456',
    email: 'john.smith@example.com',
    status: 'NotAttempted',
    attemptCount: 0,
    maxAttempts: 3,
    locked: false,
    customFields: { company: 'Acme Corp', industry: 'Technology' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    contactId: 'contact_002',
    listId: 'list_001',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+447700654321',
    email: 'jane.doe@example.com',
    status: 'NoAnswer',
    attemptCount: 1,
    maxAttempts: 5,
    locked: false,
    lastAttemptAt: new Date(Date.now() - 60000),
    nextRetryAt: new Date(Date.now() + 300000),
    customFields: { company: 'Beta Solutions', industry: 'Finance' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    contactId: 'contact_003',
    listId: 'list_002',
    firstName: 'Bob',
    lastName: 'Johnson',
    phone: '+447700987654',
    email: 'bob.johnson@example.com',
    status: 'NotAttempted',
    attemptCount: 0,
    maxAttempts: 3,
    locked: false,
    customFields: { company: 'Gamma Industries', industry: 'Manufacturing' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    contactId: 'contact_004',
    listId: 'list_001',
    firstName: 'Alice',
    lastName: 'Williams',
    phone: '+447700456789',
    email: 'alice.williams@example.com',
    status: 'Answered',
    attemptCount: 1,
    maxAttempts: 3,
    locked: false,
    lastAttemptAt: new Date(Date.now() - 3600000), // 1 hour ago
    customFields: { company: 'Delta Corp', industry: 'Healthcare' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    contactId: 'contact_005',
    listId: 'list_002',
    firstName: 'Charlie',
    lastName: 'Brown',
    phone: '+447700321654',
    email: 'charlie.brown@example.com',
    status: 'RetryEligible',
    attemptCount: 2,
    maxAttempts: 4,
    locked: false,
    lastAttemptAt: new Date(Date.now() - 1800000), // 30 min ago
    nextRetryAt: new Date(Date.now() + 600000), // 10 min from now
    customFields: { company: 'Epsilon Ltd', industry: 'Retail' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Campaign to list mappings (mock data)
const campaignListMappings: Record<string, string[]> = {
  'campaign_001': ['list_001', 'list_002'],
  'campaign_002': ['list_003'],
  'campaign_test': ['list_001'] // For testing
};

// Get contacts
// GET /api/contacts?campaignId=xxx&status=xxx&limit=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const { campaignId, status, limit, page } = req.query;
    let filteredContacts = [...mockContacts];

    // Filter by campaign if provided
    if (campaignId) {
      const campaignLists = campaignListMappings[campaignId as string] || [];
      filteredContacts = filteredContacts.filter(contact => 
        campaignLists.includes(contact.listId)
      );
    }

    // Filter by status if provided
    if (status) {
      filteredContacts = filteredContacts.filter(contact => 
        contact.status === status
      );
    }

    // Pagination
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 50;
    const offset = (pageNumber - 1) * limitNumber;
    const paginatedContacts = filteredContacts.slice(offset, offset + limitNumber);

    res.json({
      success: true,
      data: {
        contacts: paginatedContacts,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: filteredContacts.length,
          totalPages: Math.ceil(filteredContacts.length / limitNumber)
        },
        filters: {
          campaignId: campaignId || null,
          status: status || null
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

// Get specific contact by ID
// GET /api/contacts/:contactId
router.get('/:contactId', (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const contact = mockContacts.find(c => c.contactId === contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contact not found' }
      });
    }

    res.json({
      success: true,
      data: {
        contact
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
router.put('/:contactId/status', (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { status, notes, outcome } = req.body;

    const contact = mockContacts.find(c => c.contactId === contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contact not found' }
      });
    }

    // Update contact status
    contact.status = status;
    contact.lastAttemptAt = new Date();
    contact.attemptCount += 1;
    contact.updatedAt = new Date();

    // Set retry time based on status
    if (status === 'NoAnswer' && contact.attemptCount < contact.maxAttempts) {
      contact.status = 'RetryEligible';
      contact.nextRetryAt = new Date(Date.now() + 300000); // 5 minutes
    } else if (status === 'Busy' && contact.attemptCount < contact.maxAttempts) {
      contact.nextRetryAt = new Date(Date.now() + 180000); // 3 minutes
    } else if (contact.attemptCount >= contact.maxAttempts) {
      contact.status = 'MaxAttempts';
    }

    // Unlock contact
    contact.locked = false;
    contact.lockedBy = undefined;
    contact.lockedAt = undefined;

    res.json({
      success: true,
      data: {
        contact,
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
router.post('/', (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, listId, customFields } = req.body;

    if (!firstName || !lastName || !phone || !listId) {
      return res.status(400).json({
        success: false,
        error: { message: 'firstName, lastName, phone, and listId are required' }
      });
    }

    const newContact: Contact = {
      contactId: `contact_${Date.now()}`,
      listId,
      firstName,
      lastName,
      phone,
      email,
      customFields: customFields || {},
      status: 'NotAttempted',
      attemptCount: 0,
      maxAttempts: 3,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockContacts.push(newContact);

    res.status(201).json({
      success: true,
      data: {
        contact: newContact,
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

// Get contact statistics
// GET /api/contacts/stats
router.get('/stats', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;
    let contactsToAnalyze = [...mockContacts];

    // Filter by campaign if provided
    if (campaignId) {
      const campaignLists = campaignListMappings[campaignId as string] || [];
      contactsToAnalyze = contactsToAnalyze.filter(contact => 
        campaignLists.includes(contact.listId)
      );
    }

    const stats = {
      total: contactsToAnalyze.length,
      byStatus: {
        NotAttempted: contactsToAnalyze.filter(c => c.status === 'NotAttempted').length,
        Answered: contactsToAnalyze.filter(c => c.status === 'Answered').length,
        NoAnswer: contactsToAnalyze.filter(c => c.status === 'NoAnswer').length,
        Busy: contactsToAnalyze.filter(c => c.status === 'Busy').length,
        Voicemail: contactsToAnalyze.filter(c => c.status === 'Voicemail').length,
        RetryEligible: contactsToAnalyze.filter(c => c.status === 'RetryEligible').length,
        MaxAttempts: contactsToAnalyze.filter(c => c.status === 'MaxAttempts').length,
        DoNotCall: contactsToAnalyze.filter(c => c.status === 'DoNotCall').length,
        Invalid: contactsToAnalyze.filter(c => c.status === 'Invalid').length
      },
      dialable: contactsToAnalyze.filter(c => 
        !c.locked && 
        c.status !== 'MaxAttempts' && 
        c.status !== 'DoNotCall' &&
        c.status !== 'Invalid' &&
        c.attemptCount < c.maxAttempts &&
        (!c.nextRetryAt || c.nextRetryAt <= new Date())
      ).length,
      locked: contactsToAnalyze.filter(c => c.locked).length,
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

export default router;
