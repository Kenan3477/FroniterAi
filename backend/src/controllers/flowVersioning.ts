/**
 * Flow Versioning Controller
 * Advanced flow version management and rollback operations
 * Part of Phase 3: Advanced Features (Enhancement)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { flowVersioningService } from '../services/flowVersioningService';

// Input validation schemas
const createVersionSchema = z.object({
  changeLog: z.string().optional(),
  approvalRequired: z.boolean().optional().default(false)
});

const compareVersionsSchema = z.object({
  version1Id: z.string().min(1),
  version2Id: z.string().min(1)
});

const rollbackVersionSchema = z.object({
  toVersionId: z.string().min(1),
  reason: z.string().min(1),
  performedBy: z.number()
});

/**
 * GET /api/flows/:flowId/versions/history
 * Get complete version history for a flow
 */
export const getVersionHistory = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Flow ID is required'
      });
    }

    const history = await flowVersioningService.getVersionHistory(flowId);
    
    res.json({
      success: true,
      data: {
        flowId,
        versions: history,
        totalVersions: history.length
      }
    });

  } catch (error) {
    console.error('Error getting version history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get version history'
    });
  }
};

/**
 * POST /api/flows/:flowId/versions/create
 * Create a new version from the latest version
 */
export const createNewVersion = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const validatedData = createVersionSchema.parse(req.body);
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Flow ID is required'
      });
    }

    const newVersion = await flowVersioningService.createNewVersion({
      flowId,
      ...validatedData
    });
    
    res.status(201).json({
      success: true,
      data: newVersion,
      message: `Created new version ${newVersion.versionNumber} for flow ${flowId}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error creating new version:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create new version'
    });
  }
};

/**
 * POST /api/flows/:flowId/versions/compare
 * Compare two flow versions and identify differences
 */
export const compareVersions = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const validatedData = compareVersionsSchema.parse(req.body);
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Flow ID is required'
      });
    }

    const comparison = await flowVersioningService.compareVersions(validatedData);
    
    res.json({
      success: true,
      data: {
        flowId,
        comparison,
        summary: {
          totalDifferences: comparison.differences.length,
          similarity: comparison.similarity,
          riskLevel: comparison.differences.length > 10 ? 'HIGH' : 
                     comparison.differences.length > 5 ? 'MEDIUM' : 'LOW'
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error comparing versions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare versions'
    });
  }
};

/**
 * POST /api/flows/:flowId/versions/rollback
 * Rollback active version to a previous version
 */
export const rollbackToVersion = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const validatedData = rollbackVersionSchema.parse(req.body);
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Flow ID is required'
      });
    }

    // Find the currently active version
    const versions = await flowVersioningService.getVersionHistory(flowId);
    const activeVersion = versions.find(v => v.isActive);
    
    if (!activeVersion) {
      return res.status(400).json({
        success: false,
        error: 'No active version found to rollback from'
      });
    }

    const rollbackResult = await flowVersioningService.rollbackToVersion({
      fromVersionId: activeVersion.id,
      ...validatedData
    });
    
    res.json({
      success: true,
      data: rollbackResult,
      message: `Successfully rolled back flow ${flowId} to version ${validatedData.toVersionId}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Error rolling back version:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback version'
    });
  }
};

/**
 * GET /api/flows/:flowId/versions/rollbacks
 * Get rollback history for a flow
 */
export const getRollbackHistory = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Flow ID is required'
      });
    }

    const rollbacks = await flowVersioningService.getRollbackHistory(flowId);
    
    res.json({
      success: true,
      data: {
        flowId,
        rollbacks,
        totalRollbacks: rollbacks.length
      }
    });

  } catch (error) {
    console.error('Error getting rollback history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rollback history'
    });
  }
};

/**
 * DELETE /api/flows/:flowId/versions/archive
 * Archive old versions based on retention policy
 */
export const archiveOldVersions = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const { retainCount = 10 } = req.query;
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Flow ID is required'
      });
    }

    const retainCountNumber = parseInt(retainCount as string);
    if (isNaN(retainCountNumber) || retainCountNumber < 1) {
      return res.status(400).json({
        success: false,
        error: 'retainCount must be a positive number'
      });
    }

    const archivedCount = await flowVersioningService.archiveOldVersions(flowId, retainCountNumber);
    
    res.json({
      success: true,
      data: {
        flowId,
        archivedCount,
        retainCount: retainCountNumber
      },
      message: `Archived ${archivedCount} old versions for flow ${flowId}`
    });

  } catch (error) {
    console.error('Error archiving old versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive old versions'
    });
  }
};