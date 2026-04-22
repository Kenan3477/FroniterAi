import express from 'express';
import { authenticate } from '../../middleware/auth';

import { prisma } from '../../lib/prisma';
const router = express.Router();
// Utility function to normalize phone number
function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^\d+]/g, '');
}

// Get all DNC numbers
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('📞 Fetching DNC numbers list');
    
    const dncNumbers = await prisma.dnc_numbers.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Found ${dncNumbers.length} DNC numbers`);
    
    res.json({
      success: true,
      data: dncNumbers
    });
  } catch (error) {
    console.error('❌ Error fetching DNC numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DNC numbers'
    });
  }
});

// Add number to DNC
router.post('/', authenticate, async (req, res) => {
  try {
    const { phoneNumber, reason, addedBy } = req.body;
    
    console.log('📞 Adding number to DNC:', { phoneNumber, reason, addedBy });
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    // Validate normalized number
    if (normalizedNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    // Check if already exists
    const existing = await prisma.dnc_numbers.findUnique({
      where: { phoneNumber: normalizedNumber }
    });
    
    if (existing) {
      console.log('❌ Number already exists in DNC:', normalizedNumber);
      return res.status(409).json({
        success: false,
        error: 'Number already exists in DNC list'
      });
    }
    
    const dncNumber = await prisma.dnc_numbers.create({
      data: {
        phoneNumber: normalizedNumber,
        originalFormat: phoneNumber,
        reason: reason || 'Customer request',
        addedBy: addedBy || "System",
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Added number to DNC successfully:', dncNumber.id);
    
    res.json({
      success: true,
      data: dncNumber
    });
  } catch (error) {
    console.error('❌ Error adding DNC number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add number to DNC list'
    });
  }
});

// Remove number from DNC
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📞 Removing number from DNC:', id);
    
    await prisma.dnc_numbers.delete({
      where: { id: parseInt(id) }
    });
    
    console.log('✅ Removed number from DNC successfully:', id);
    
    res.json({
      success: true,
      message: 'Number removed from DNC list'
    });
  } catch (error) {
    console.error('❌ Error removing DNC number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove number from DNC list'
    });
  }
});

// Check if number is on DNC
router.post('/check', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Normalize phone number
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    console.log('📞 Checking DNC status for:', normalizedNumber);
    
    const dncEntry = await prisma.dnc_numbers.findUnique({
      where: { phoneNumber: normalizedNumber }
    });
    
    const isBlocked = !!dncEntry;
    
    console.log(`${isBlocked ? '❌ Number is blocked' : '✅ Number is not blocked'}:`, normalizedNumber);
    
    res.json({
      success: true,
      isBlocked,
      dncEntry: dncEntry || null
    });
  } catch (error) {
    console.error('❌ Error checking DNC number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check DNC status'
    });
  }
});

// Bulk import DNC numbers
router.post('/bulk-import', authenticate, async (req, res) => {
  try {
    const { numbers, reason, addedBy } = req.body;
    
    console.log('📞 Bulk importing DNC numbers:', numbers?.length || 0);
    
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Numbers array is required'
      });
    }
    
    const results = {
      added: 0,
      skipped: 0,
      errors: [] as Array<{ number: string; error: string }>
    };
    
    for (const number of numbers) {
      try {
        const normalizedNumber = normalizePhoneNumber(number);
        
        // Validate normalized number
        if (normalizedNumber.length < 10) {
          results.errors.push({ number, error: 'Invalid phone number format' });
          continue;
        }
        
        // Check if already exists
        const existing = await prisma.dnc_numbers.findUnique({
          where: { phoneNumber: normalizedNumber }
        });
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        await prisma.dnc_numbers.create({
          data: {
            phoneNumber: normalizedNumber,
            originalFormat: number,
            reason: reason || 'Bulk import',
            addedBy: addedBy || "System",
        updatedAt: new Date()
          }
        });
        
        results.added++;
      } catch (error) {
        results.errors.push({ 
          number, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log('✅ Bulk import completed:', results);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Error bulk importing DNC numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk import DNC numbers'
    });
  }
});

// Get DNC statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    console.log('📞 Fetching DNC statistics');
    
    // Total count
    const totalCount = await prisma.dnc_numbers.count();
    
    // Today's count (numbers added today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await prisma.dnc_numbers.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Recently added numbers (last 10)
    const recentlyAdded = await prisma.dnc_numbers.findMany({
      select: {
        phoneNumber: true,
        originalFormat: true,
        reason: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    const stats = {
      totalCount,
      todayCount,
      recentlyAdded
    };
    
    console.log('✅ DNC statistics compiled:', { totalCount, todayCount, recentCount: recentlyAdded.length });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching DNC statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DNC statistics'
    });
  }
});

export default router;