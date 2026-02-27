const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Temporary debug route - NO AUTH REQUIRED
router.get('/debug-interactions', async (req, res) => {
  try {
    console.log('🐛 DEBUG: Testing interaction history without auth...');
    
    const agentId = req.query.agentId || '509';
    const limit = parseInt(req.query.limit) || 20;
    
    console.log(`🔍 Debug query for agentId: ${agentId}, limit: ${limit}`);
    
    const baseWhere = { agentId };
    
    // Default to today's records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    baseWhere.createdAt = {
      gte: today,
      lt: tomorrow
    };
    
    console.log('📋 Query filters:', baseWhere);

    const callRecords = await prisma.callRecord.findMany({
      where: baseWhere,
      include: {
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2
    });

    console.log(`📊 Found ${callRecords.length} records`);

    // Transform records
    const transformedRecords = callRecords.map(record => ({
      id: record.id,
      contactName: record.contact ? 
        `${record.contact.firstName || ''} ${record.contact.lastName || ''}`.trim() || 
        record.contact.phone || 'Unknown' : 'Unknown',
      outcome: record.outcome || 'pending',
      dateTime: record.createdAt.toISOString(),
      agentId: record.agentId,
      campaignName: record.campaign?.name || 'Unknown'
    }));

    // Categorize
    const outcomed = transformedRecords.filter(record => 
      record.outcome && 
      record.outcome !== 'pending' && 
      record.outcome !== ''
    );

    const result = {
      success: true,
      debug: true,
      agentId,
      queryFilters: baseWhere,
      rawRecords: callRecords.length,
      categorization: {
        outcomed: outcomed.length,
        allocated: 0,
        queued: 0,
        unallocated: 0
      },
      data: {
        outcomed,
        allocated: [],
        queued: [],
        unallocated: []
      }
    };

    console.log('📊 Debug result:', result.categorization);
    res.json(result);

  } catch (error) {
    console.error('❌ Debug route error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      debug: true
    });
  }
});

module.exports = router;