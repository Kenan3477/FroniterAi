/**
 * Emergency Cleanup Routes
 * Provides alternative cleanup endpoints when main routes fail
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../database/index';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/emergency/wipe-call-data
 * Emergency endpoint to wipe all call data
 * Uses simple approach without transactions
 */
router.post('/wipe-call-data', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    console.log('🚨 EMERGENCY: Wiping all call data...');
    
    const results = {
      recordings: 0,
      transcriptions: 0,
      kpis: 0,
      sales: 0,
      interactions: 0,
      callRecords: 0,
      queueEntries: 0,
      contactsReset: 0,
      total: 0
    };
    
    // Delete recordings first (foreign key dependency)
    try {
      const deletedRecordings = await prisma.recording.deleteMany({});
      results.recordings = deletedRecordings.count;
      console.log(`✅ Deleted ${deletedRecordings.count} recordings`);
    } catch (e) {
      console.log('⚠️ Recording deletion failed:', e);
    }
    
    // Delete transcriptions
    try {
      const deletedTranscriptions = await prisma.transcription.deleteMany({});
      results.transcriptions = deletedTranscriptions.count;
      console.log(`✅ Deleted ${deletedTranscriptions.count} transcriptions`);
    } catch (e) {
      console.log('⚠️ Transcription deletion failed:', e);
    }
    
    // Delete KPIs
    try {
      const deletedKPIs = await prisma.callKPI.deleteMany({});
      results.kpis = deletedKPIs.count;
      console.log(`✅ Deleted ${deletedKPIs.count} KPIs`);
    } catch (e) {
      console.log('⚠️ KPI deletion failed:', e);
    }
    
    // Delete sales
    try {
      const deletedSales = await prisma.sale.deleteMany({});
      results.sales = deletedSales.count;
      console.log(`✅ Deleted ${deletedSales.count} sales`);
    } catch (e) {
      console.log('⚠️ Sales deletion failed:', e);
    }
    
    // Delete interactions
    try {
      const deletedInteractions = await prisma.interaction.deleteMany({});
      results.interactions = deletedInteractions.count;
      console.log(`✅ Deleted ${deletedInteractions.count} interactions`);
    } catch (e) {
      console.log('⚠️ Interaction deletion failed:', e);
    }
    
    // Delete call records
    try {
      const deletedCallRecords = await prisma.callRecord.deleteMany({});
      results.callRecords = deletedCallRecords.count;
      console.log(`✅ Deleted ${deletedCallRecords.count} call records`);
    } catch (e) {
      console.log('⚠️ Call record deletion failed:', e);
    }
    
    // Delete queue entries
    try {
      const deletedQueueEntries = await prisma.dialQueueEntry.deleteMany({});
      results.queueEntries = deletedQueueEntries.count;
      console.log(`✅ Deleted ${deletedQueueEntries.count} queue entries`);
    } catch (e) {
      console.log('⚠️ Queue entry deletion failed:', e);
    }
    
    // Reset contacts
    try {
      const resetContacts = await prisma.contact.updateMany({
        data: { status: 'new' }
      });
      results.contactsReset = resetContacts.count;
      console.log(`✅ Reset ${resetContacts.count} contacts to new status`);
    } catch (e) {
      console.log('⚠️ Contact reset failed:', e);
    }
    
    results.total = results.recordings + results.transcriptions + results.kpis + 
                   results.sales + results.interactions + results.callRecords + 
                   results.queueEntries;
    
    console.log(`🎯 Emergency cleanup completed. Total deleted: ${results.total}`);
    
    res.json({
      success: true,
      message: 'Emergency call data wipe completed',
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Emergency cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;