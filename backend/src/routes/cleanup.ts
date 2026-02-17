import { Router } from 'express';
import { prisma } from '../database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * ADMIN ONLY: Emergency cleanup endpoint to remove test inbound numbers
 * This should only be used to clean up test data from production database
 */
router.post('/cleanup-test-numbers', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('🚨 ADMIN CLEANUP: Starting test numbers removal...');
    
    // List current numbers before cleanup
    const beforeNumbers = await prisma.inboundNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    });
    
    console.log('📊 Numbers before cleanup:', beforeNumbers.length);
    beforeNumbers.forEach(num => {
      console.log(`   - ${num.phoneNumber} (${num.displayName})`);
    });
    
    // Delete test numbers - keep only the real Twilio number
    const testNumbersToDelete = ['+447700900123', '+14155552456', '+15551234567'];
    let totalDeleted = 0;
    
    for (const phoneNumber of testNumbersToDelete) {
      const deleteResult = await prisma.inboundNumber.deleteMany({
        where: { phoneNumber }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} records for ${phoneNumber}`);
      totalDeleted += deleteResult.count;
    }
    
    // Verify final state
    const afterNumbers = await prisma.inboundNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    });
    
    console.log('📊 Numbers after cleanup:', afterNumbers.length);
    afterNumbers.forEach(num => {
      console.log(`   - ${num.phoneNumber} (${num.displayName})`);
    });
    
    res.json({
      success: true,
      message: 'Test numbers cleanup completed',
      stats: {
        before: beforeNumbers.length,
        deleted: totalDeleted,
        after: afterNumbers.length,
        remaining: afterNumbers.map(n => ({
          phoneNumber: n.phoneNumber,
          displayName: n.displayName
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup test numbers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ADMIN ONLY: Cleanup demo/test call records  
 * Removes call records that are not from real Twilio calls
 */
router.post('/cleanup-demo-records', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('🚨 ADMIN CLEANUP: Starting demo call records removal...');
    
    // List current call records before cleanup
    const beforeRecords = await prisma.callRecord.findMany({
      orderBy: { startTime: 'desc' },
      take: 20 // Show recent records for review
    });
    
    console.log('📊 Call records before cleanup:', beforeRecords.length);
    beforeRecords.forEach(record => {
      console.log(`   - ${record.phoneNumber} (${record.callType}) - ${record.startTime}`);
    });
    
    // Define criteria for demo/test records to remove
    const demoPhoneNumbers = ['+1234567890', '+447700900123', '+14155552456', '+15551234567'];
    const demoCallIds = ['DEMO-CALL-001', 'DEMO-CALL-002', 'CALL-2026-001', 'CALL-2026-002', 'CALL-2026-003'];
    
    // Delete demo records by phone numbers
    let totalDeleted = 0;
    
    for (const phoneNumber of demoPhoneNumbers) {
      const deleteResult = await prisma.callRecord.deleteMany({
        where: { phoneNumber }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} call records for ${phoneNumber}`);
      totalDeleted += deleteResult.count;
    }
    
    // Delete demo records by call IDs  
    for (const callId of demoCallIds) {
      const deleteResult = await prisma.callRecord.deleteMany({
        where: { callId }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} call records for callId ${callId}`);
      totalDeleted += deleteResult.count;
    }
    
    // Delete any records with 'demo' or 'test' in various fields (case insensitive)
    const demoByContent = await prisma.callRecord.deleteMany({
      where: {
        OR: [
          { notes: { contains: 'demo', mode: 'insensitive' } },
          { notes: { contains: 'test', mode: 'insensitive' } },
          { callId: { contains: 'demo', mode: 'insensitive' } },
          { callId: { contains: 'test', mode: 'insensitive' } },
          { campaignId: { contains: 'demo', mode: 'insensitive' } },
          { campaignId: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`✅ Deleted ${demoByContent.count} additional demo records by content`);
    totalDeleted += demoByContent.count;
    
    // Verify final state - show remaining records
    const afterRecords = await prisma.callRecord.findMany({
      orderBy: { startTime: 'desc' }
    });
    
    console.log('📊 Call records after cleanup:', afterRecords.length);
    afterRecords.forEach(record => {
      console.log(`   - ${record.phoneNumber} (${record.callType}) - ${record.startTime}`);
    });
    
    res.json({
      success: true,
      message: 'Demo call records cleanup completed',
      stats: {
        totalDeleted,
        remainingRecords: afterRecords.length,
        remaining: afterRecords.map(r => ({
          phoneNumber: r.phoneNumber,
          callType: r.callType,
          startTime: r.startTime,
          callId: r.callId
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Demo cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup demo call records',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;