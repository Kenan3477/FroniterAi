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

export default router;