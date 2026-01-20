import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Normalize phone number function
function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^\d+]/g, '');
}

/**
 * GET /api/admin/dnc
 * Get all DNC numbers with pagination and search
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = search
      ? {
          OR: [
            { phoneNumber: { contains: search as string, mode: 'insensitive' } },
            { originalFormat: { contains: search as string, mode: 'insensitive' } },
            { reason: { contains: search as string, mode: 'insensitive' } },
            { addedBy: { contains: search as string, mode: 'insensitive' } }
          ]
        }
      : {};

    const [dncNumbers, totalCount] = await Promise.all([
      prisma.dncNumber.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit)
      }),
      prisma.dncNumber.count({ where: whereClause })
    ]);
    
    res.json({
      success: true,
      data: dncNumbers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching DNC numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DNC numbers'
    });
  }
});

/**
 * POST /api/admin/dnc
 * Add number to DNC list
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, reason, addedBy } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    if (normalizedNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    // Check if already exists
    const existing = await prisma.dncNumber.findUnique({
      where: { phoneNumber: normalizedNumber }
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Number already exists in DNC list'
      });
    }
    
    const dncNumber = await prisma.dncNumber.create({
      data: {
        phoneNumber: normalizedNumber,
        originalFormat: phoneNumber.trim(),
        reason: reason || 'Customer request',
        addedBy: addedBy || 'System',
        createdAt: new Date()
      }
    });
    
    console.log('✅ Added number to DNC list:', {
      phoneNumber: normalizedNumber,
      originalFormat: phoneNumber,
      reason: reason || 'Customer request'
    });
    
    res.json({
      success: true,
      data: dncNumber,
      message: 'Number successfully added to DNC list'
    });
  } catch (error) {
    console.error('Error adding DNC number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add number to DNC list'
    });
  }
});

/**
 * DELETE /api/admin/dnc/:id
 * Remove number from DNC list
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const dncNumber = await prisma.dncNumber.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!dncNumber) {
      return res.status(404).json({
        success: false,
        error: 'DNC number not found'
      });
    }
    
    await prisma.dncNumber.delete({
      where: { id: parseInt(id) }
    });
    
    console.log('✅ Removed number from DNC list:', dncNumber.phoneNumber);
    
    res.json({
      success: true,
      message: 'Number removed from DNC list'
    });
  } catch (error) {
    console.error('Error removing DNC number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove number from DNC list'
    });
  }
});

/**
 * POST /api/admin/dnc/check
 * Check if number is on DNC list
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Normalize phone number for checking
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    const dncEntry = await prisma.dncNumber.findUnique({
      where: { phoneNumber: normalizedNumber }
    });
    
    res.json({
      success: true,
      isBlocked: !!dncEntry,
      dncEntry: dncEntry || null,
      checkedNumber: normalizedNumber
    });
  } catch (error) {
    console.error('Error checking DNC number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check DNC status'
    });
  }
});

/**
 * POST /api/admin/dnc/bulk-import
 * Bulk import DNC numbers
 */
router.post('/bulk-import', authenticateToken, async (req, res) => {
  try {
    const { numbers, reason, addedBy } = req.body;
    
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
        const trimmedNumber = number.trim();
        if (!trimmedNumber) continue;
        
        const normalizedNumber = normalizePhoneNumber(trimmedNumber);
        
        if (normalizedNumber.length < 10) {
          results.errors.push({ number: trimmedNumber, error: 'Invalid phone number format' });
          continue;
        }
        
        // Check if already exists
        const existing = await prisma.dncNumber.findUnique({
          where: { phoneNumber: normalizedNumber }
        });
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        await prisma.dncNumber.create({
          data: {
            phoneNumber: normalizedNumber,
            originalFormat: trimmedNumber,
            reason: reason || 'Bulk import',
            addedBy: addedBy || 'System',
            createdAt: new Date()
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
      data: results,
      message: `Bulk import completed: ${results.added} added, ${results.skipped} skipped, ${results.errors.length} errors`
    });
  } catch (error) {
    console.error('Error bulk importing DNC numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk import DNC numbers'
    });
  }
});

/**
 * GET /api/admin/dnc/stats
 * Get DNC statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalCount = await prisma.dncNumber.count();
    const todayCount = await prisma.dncNumber.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    
    const recentlyAdded = await prisma.dncNumber.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        phoneNumber: true,
        originalFormat: true,
        reason: true,
        createdAt: true
      }
    });
    
    res.json({
      success: true,
      data: {
        totalCount,
        todayCount,
        recentlyAdded
      }
    });
  } catch (error) {
    console.error('Error fetching DNC stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DNC statistics'
    });
  }
});

export default router;