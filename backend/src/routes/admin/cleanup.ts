/**
 * Admin Cleanup Endpoint
 * Delete call records without recordings
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../database/index';

const router = Router();

/**
 * DELETE /api/admin/cleanup/calls-without-recordings
 * Delete all call records that don't have recordings
 */
router.delete('/calls-without-recordings', async (req: Request, res: Response) => {
  try {
    console.log('🗑️  ADMIN CLEANUP: Deleting call records without recordings');
    console.log('Timestamp:', new Date().toISOString());

    // Step 1: Count calls without recordings
    const callsWithoutRecordings = await prisma.callRecord.count({
      where: {
        AND: [
          { recordingFile: null },
          { recording: null }
        ]
      }
    });

    console.log(`📊 Found ${callsWithoutRecordings} call records WITHOUT recordings`);

    if (callsWithoutRecordings === 0) {
      return res.json({
        success: true,
        message: 'No call records to delete - all have recordings!',
        deleted: 0,
        remaining: await prisma.callRecord.count()
      });
    }

    // Step 2: Get statistics BEFORE deletion
    const totalBefore = await prisma.callRecord.count();
    const withRecordingsBefore = await prisma.callRecord.count({
      where: {
        OR: [
          { recordingFile: { not: null } },
          { recording: { not: null } }
        ]
      }
    });

    console.log('📈 BEFORE deletion:');
    console.log(`   Total: ${totalBefore}`);
    console.log(`   With Recordings: ${withRecordingsBefore}`);
    console.log(`   Without Recordings: ${callsWithoutRecordings}`);

    // Step 3: DELETE the records
    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        AND: [
          { recordingFile: null },
          { recording: null }
        ]
      }
    });

    console.log(`✅ DELETED ${deleteResult.count} call records`);

    // Step 4: Get statistics AFTER deletion
    const totalAfter = await prisma.callRecord.count();
    const withRecordingsAfter = await prisma.callRecord.count({
      where: {
        OR: [
          { recordingFile: { not: null } },
          { recording: { not: null } }
        ]
      }
    });

    console.log('📈 AFTER deletion:');
    console.log(`   Total: ${totalAfter}`);
    console.log(`   With Recordings: ${withRecordingsAfter}`);

    res.json({
      success: true,
      message: `Deleted ${deleteResult.count} call records without recordings`,
      deleted: deleteResult.count,
      before: {
        total: totalBefore,
        withRecordings: withRecordingsBefore,
        withoutRecordings: callsWithoutRecordings
      },
      after: {
        total: totalAfter,
        withRecordings: withRecordingsAfter,
        withoutRecordings: totalAfter - withRecordingsAfter
      }
    });

  } catch (error) {
    console.error('❌ Error deleting calls without recordings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete call records',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/cleanup/stats
 * Get statistics about call records with/without recordings
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const total = await prisma.callRecord.count();
    
    const withRecordings = await prisma.callRecord.count({
      where: {
        OR: [
          { recordingFile: { not: null } },
          { recording: { not: null } }
        ]
      }
    });

    const withoutRecordings = await prisma.callRecord.count({
      where: {
        AND: [
          { recordingFile: null },
          { recording: null }
        ]
      }
    });

    const duplicates = await prisma.callRecord.count({
      where: {
        outcome: 'consolidated-duplicate'
      }
    });

    res.json({
      success: true,
      stats: {
        total,
        withRecordings,
        withoutRecordings,
        duplicates,
        percentage: total > 0 ? Math.round((withRecordings / total) * 100) : 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
