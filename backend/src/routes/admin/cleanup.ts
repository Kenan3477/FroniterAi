/**
 * Admin cleanup: call records with no synced Recording row (UI shows "No recording").
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../database/index';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

const DEFAULT_MIN_AGE_MINUTES = 60;

function parseMinAgeMinutes(req: Request): number {
  const raw = req.query.minAgeMinutes ?? (req.body && (req.body as any).minAgeMinutes);
  if (raw === undefined || raw === null || raw === '') return DEFAULT_MIN_AGE_MINUTES;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MIN_AGE_MINUTES;
  return Math.min(n, 365 * 24 * 60);
}

function parseDryRun(req: Request): boolean {
  const q = String(req.query.dryRun || '').toLowerCase();
  if (q === 'true' || q === '1') return true;
  const body = req.body as { dryRun?: boolean } | undefined;
  return body?.dryRun === true;
}

/**
 * GET /api/admin/cleanup/stats
 * Call records: total, with a Recording row (playable), without.
 */
router.get('/stats', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const total = await prisma.callRecord.count();

    const withRecordingFile = await prisma.callRecord.count({
      where: { recordingFile: { isNot: null } },
    });

    const withoutRecordingFile = await prisma.callRecord.count({
      where: { recordingFile: null },
    });

    const duplicates = await prisma.callRecord.count({
      where: { outcome: 'consolidated-duplicate' },
    });

    res.json({
      success: true,
      stats: {
        total,
        withRecordingFile,
        withoutRecordingFile,
        duplicates,
        percentageWithRecording:
          total > 0 ? Math.round((withRecordingFile / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('❌ Error getting cleanup stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/admin/cleanup/calls-without-recordings?dryRun=true&minAgeMinutes=60
 *
 * Deletes completed call_record rows that have no `recordings` row (what the
 * reports UI treats as "No recording"). Often these are duplicate legs where
 * disposition was saved on a CA… callId row while the conf-… row holds the Recording.
 *
 * Safety: only rows with endTime set and endTime older than minAgeMinutes (default 60).
 */
router.delete(
  '/calls-without-recordings',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const dryRun = parseDryRun(req);
      const minAgeMinutes = parseMinAgeMinutes(req);
      const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000);

      const where = {
        recordingFile: null as const,
        // Completed calls only; NULL endTime excluded by `lt` filter
        endTime: { lt: cutoff },
      };

      const eligible = await prisma.callRecord.count({ where });

      if (eligible === 0) {
        return res.json({
          success: true,
          message: 'No eligible call records (completed, older than cutoff, no recording row).',
          deleted: 0,
          dryRun,
          minAgeMinutes,
          cutoff: cutoff.toISOString(),
        });
      }

      if (dryRun) {
        const sample = await prisma.callRecord.findMany({
          where,
          take: 25,
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            callId: true,
            phoneNumber: true,
            outcome: true,
            startTime: true,
            endTime: true,
            recording: true,
          },
        });
        return res.json({
          success: true,
          dryRun: true,
          message: `Would delete ${eligible} call record(s). Pass dryRun=false (or omit) to execute.`,
          wouldDelete: eligible,
          minAgeMinutes,
          cutoff: cutoff.toISOString(),
          sample,
        });
      }

      const totalBefore = await prisma.callRecord.count();
      const deleteResult = await prisma.callRecord.deleteMany({ where });
      const totalAfter = await prisma.callRecord.count();

      console.log(
        `🗑️ ADMIN CLEANUP: deleted ${deleteResult.count} call_record(s) without recordingFile (endTime < ${cutoff.toISOString()})`,
      );

      res.json({
        success: true,
        message: `Deleted ${deleteResult.count} call record(s) with no recording file (completed & older than ${minAgeMinutes}m).`,
        deleted: deleteResult.count,
        dryRun: false,
        minAgeMinutes,
        cutoff: cutoff.toISOString(),
        before: { total: totalBefore },
        after: { total: totalAfter },
      });
    } catch (error) {
      console.error('❌ Error deleting calls without recordings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete call records',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

export default router;
