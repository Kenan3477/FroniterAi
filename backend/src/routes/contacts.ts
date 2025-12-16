import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/contacts/lookup
 * Lookup customer by phone number
 */
router.get('/lookup', async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    console.log('🔍 Looking up customer by phone:', phoneNumber);

    // Search for contact by phone number (use 'phone' field)
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { phone: phoneNumber.replace(/\s+/g, '') }, // Try without spaces
          { phone: phoneNumber.replace(/[\s-()]/g, '') }, // Try without formatting
          { mobile: phoneNumber },
          { mobile: phoneNumber.replace(/\s+/g, '') }
        ]
      },
      select: {
        id: true,
        contactId: true,
        firstName: true,
        lastName: true,
        phone: true,
        mobile: true,
        email: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!contact) {
      console.log('❌ No customer found for:', phoneNumber);
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log('✅ Customer found:', contact.id);
    res.json(contact);
  } catch (error) {
    console.error('❌ Customer lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/contacts/save-call-data
 * Save customer info and call disposition after call ends
 */
router.post('/save-call-data', async (req, res) => {
  try {
    const {
      phoneNumber,
      customerInfo,
      disposition,
      callDuration,
      agentId,
      campaignId
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    console.log('💾 Saving call data for:', phoneNumber);

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { phone: phoneNumber.replace(/\s+/g, '') },
          { mobile: phoneNumber },
          { mobile: phoneNumber.replace(/\s+/g, '') }
        ]
      }
    });

    if (!contact && customerInfo) {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          contactId: `CONT-${Date.now()}`,
          listId: 'manual-dial', // Default list for manual calls
          firstName: customerInfo.firstName || '',
          lastName: customerInfo.lastName || '',
          phone: phoneNumber,
          email: customerInfo.email || null,
          address: customerInfo.address || null,
          notes: customerInfo.notes || null,
          status: 'contacted'
        }
      });
      console.log('✅ New contact created:', contact.id);
    } else if (contact && customerInfo) {
      // Update existing contact
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          firstName: customerInfo.firstName || contact.firstName,
          lastName: customerInfo.lastName || contact.lastName,
          email: customerInfo.email || contact.email,
          address: customerInfo.address || contact.address,
          notes: customerInfo.notes || contact.notes
        }
      });
      console.log('✅ Contact updated:', contact.id);
    }

    // Create interaction record
    const interaction = await prisma.interaction.create({
      data: {
        interactionId: `INT-${Date.now()}`,
        contactId: contact?.id || 'unknown',
        agentId: agentId || 'unknown',
        campaignId: campaignId || 'manual-dial',
        type: 'call',
        direction: 'outbound',
        status: 'completed',
        duration: callDuration || 0,
        outcome: disposition?.outcome || 'unknown',
        notes: disposition?.notes || null
      }
    });

    console.log('✅ Interaction saved:', interaction.id);

    res.json({
      success: true,
      contact,
      interaction
    });
  } catch (error) {
    console.error('❌ Save call data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
