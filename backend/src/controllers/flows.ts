import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { flowExecutionEngine, FlowExecutionContext } from '../services/flowExecutionEngine';

const prisma = new PrismaClient();

// Validation schemas
const createFlowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
});

const deployFlowSchema = z.object({
  versionId: z.string().optional(),
});

const updateFlowSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

// Mock current user - in real app this would come from auth
const CURRENT_USER_ID = 'demo-user-kennex-flows';

/**
 * GET /api/flows
 * List all flows with optional filtering
 */
export const getFlows = async (req: Request, res: Response) => {
  try {
    const { search, status, sort = 'updated_desc' } = req.query;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }
    if (status) {
      where.status = status;
    } else {
      // By default, exclude archived flows
      where.status = { not: 'ARCHIVED' };
    }

    // Build order by clause
    let orderBy: any = { updatedAt: 'desc' };
    switch (sort) {
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'created_desc':
        orderBy = { createdAt: 'desc' };
        break;
      case 'created_asc':
        orderBy = { createdAt: 'asc' };
        break;
    }

    const flows = await prisma.flow.findMany({
      where,
      orderBy,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    // Transform to API format
    const flowsData = flows.map((flow: any) => ({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      status: flow.status,
      latestVersionNumber: flow.versions[0]?.versionNumber || 0,
      updatedAt: flow.updatedAt.toISOString(),
      createdAt: flow.createdAt.toISOString(),
    }));

    res.json(flowsData);
  } catch (error) {
    console.error('Error fetching flows:', error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
};

/**
 * GET /api/flows/:flowId
 * Get flow details with active version info
 */
export const getFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const activeVersion = (flow as any).versions.find((v: any) => v.isActive);
    const draftVersion = (flow as any).versions.find((v: any) => v.isDraft);

    res.json({
      ...flow,
      activeVersion,
      draftVersion,
    });
  } catch (error) {
    console.error('Error fetching flow:', error);
    res.status(500).json({ error: 'Failed to fetch flow' });
  }
};

/**
 * POST /api/flows
 * Create a new flow with initial draft version
 */
export const createFlow = async (req: Request, res: Response) => {
  try {
    const validatedData = createFlowSchema.parse(req.body);

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: 'admin@kennex.ai' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Kennex Admin',
          email: 'admin@kennex.ai',
        }
      });
    }

    const flow = await prisma.flow.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        status: 'INACTIVE',
        createdByUserId: user.id,
        versions: {
          create: {
            versionNumber: 1,
            isActive: false,
            isDraft: true,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    const draftVersion = flow.versions[0];

    res.status(201).json({
      flowId: flow.id,
      versionId: draftVersion.id,
      flow: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        status: flow.status,
        versionNumber: draftVersion.versionNumber,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
};

/**
 * POST /api/flows/:flowId/deploy
 * Deploy a flow version (activate and create new draft)
 */
export const deployFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const validatedData = deployFlowSchema.parse(req.body);

    // Get the flow with versions
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    // Find version to deploy (default to current draft)
    const versionToDeploy = validatedData.versionId 
      ? flow.versions.find((v: any) => v.id === validatedData.versionId)
      : flow.versions.find((v: any) => v.isDraft);

    if (!versionToDeploy) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Validation: Check for entry node
    const hasEntryNode = versionToDeploy.nodes.some((node: any) => {
      const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
      return node.isEntry;
    });

    if (!hasEntryNode) {
      return res.status(400).json({ 
        error: 'Flow must have at least one entry node'
      });
    }

    // Validation: Check edges reference existing nodes
    const nodeIds = versionToDeploy.nodes.map((n: any) => n.id);
    const invalidEdges = versionToDeploy.edges.filter((edge: any) => 
      !nodeIds.includes(edge.sourceNodeId) || !nodeIds.includes(edge.targetNodeId)
    );

    if (invalidEdges.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid edges found - edges must reference existing nodes'
      });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Deactivate current active version
      await tx.flowVersion.updateMany({
        where: { flowId, isActive: true },
        data: { isActive: false },
      });

      // Activate the selected version
      const activeVersion = await tx.flowVersion.update({
        where: { id: versionToDeploy.id },
        data: {
          isActive: true,
          isDraft: false,
          publishedAt: new Date(),
        },
      });

      // Update flow status
      await tx.flow.update({
        where: { id: flowId },
        data: { status: 'ACTIVE' },
      });

      // Create new draft version
      const newDraftVersion = await tx.flowVersion.create({
        data: {
          flowId,
          versionNumber: versionToDeploy.versionNumber + 1,
          isActive: false,
          isDraft: true,
          // Clone nodes from deployed version
          nodes: {
            create: versionToDeploy.nodes.map((node: any) => ({
              type: node.type,
              label: node.label,
              category: node.category,
              x: node.x,
              y: node.y,
              config: node.config,
              isEntry: node.isEntry,
            })),
          },
          // Clone edges from deployed version
          edges: {
            create: versionToDeploy.edges.map((edge: any) => ({
              sourceNodeId: edge.sourceNodeId,
              targetNodeId: edge.targetNodeId,
              sourcePort: edge.sourcePort,
              label: edge.label,
            })),
          },
        },
      });

      return { activeVersion, newDraftVersion };
    });

    res.json({
      success: true,
      activeVersion: result.activeVersion,
      newDraftVersion: result.newDraftVersion,
      message: `Flow deployed successfully. Version ${versionToDeploy.versionNumber} is now active.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error deploying flow:', error);
    res.status(500).json({ error: 'Failed to deploy flow' });
  }
};

/**
 * PUT /api/flows/:flowId
 * Update flow metadata (name, description, status)
 */
export const updateFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const validatedData = updateFlowSchema.parse(req.body);

    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const updatedFlow = await prisma.flow.update({
      where: { id: flowId },
      data: validatedData,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            versionNumber: true,
            isActive: true,
            isDraft: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Flow updated successfully',
      flow: {
        ...updatedFlow,
        latestVersionNumber: updatedFlow.versions[0]?.versionNumber || 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error updating flow:', error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
};

/**
 * DELETE /api/flows/:flowId
 * Archive a flow (soft delete) with proper state management for deployed flows
 */
export const archiveFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    // Simple boolean check for force parameter
    const force = req.query.force === 'true';

    // Get the flow with version information
    const existingFlow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!existingFlow) {
      return res.status(404).json({ 
        error: 'Flow not found',
        code: 'FLOW_NOT_FOUND'
      });
    }

    // Check if flow is currently deployed/active
    const hasActiveVersion = existingFlow.versions.length > 0;
    
    if (existingFlow.status === 'ACTIVE' && hasActiveVersion && !force) {
      return res.status(409).json({
        error: 'Cannot delete flow: Flow is currently deployed and active. Set force=true to force deletion.',
        code: 'FLOW_DEPLOYED',
        flow: {
          id: existingFlow.id,
          name: existingFlow.name,
          status: existingFlow.status,
          hasActiveVersions: hasActiveVersion
        }
      });
    }

    // If flow is active and force is requested, deactivate all versions first
    if (existingFlow.status === 'ACTIVE' && force) {
      await prisma.flowVersion.updateMany({
        where: { flowId: flowId, isActive: true },
        data: { isActive: false }
      });
      
      console.log(`Force deletion: Deactivated ${existingFlow.versions.length} active versions for flow ${flowId}`);
    }

    // Archive the flow (soft delete)
    const archivedFlow = await prisma.flow.update({
      where: { id: flowId },
      data: { 
        status: 'ARCHIVED',
        updatedAt: new Date()
      },
      include: {
        versions: {
          select: {
            id: true,
            versionNumber: true,
            isActive: true,
            isDraft: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: force 
        ? 'Flow force-deleted successfully (was active and deployed)'
        : 'Flow archived successfully',
      flow: archivedFlow,
      metadata: {
        wasActive: existingFlow.status === 'ACTIVE',
        hadActiveVersions: hasActiveVersion,
        forcedDeletion: force,
        versionsCount: archivedFlow.versions.length
      }
    });

  } catch (error) {
    console.error('Error archiving flow:', error);
    
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to archive flow',
        details: error.message,
        code: 'ARCHIVE_FAILED'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to archive flow',
        code: 'ARCHIVE_FAILED'
      });
    }
  }
};

/**
 * POST /api/flows/:flowId/execute
 * Test flow execution
 */
export const executeFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const { phoneNumber, variables = {} } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    // Create a test execution context
    const context: FlowExecutionContext = {
      callId: `test-call-${Date.now()}`,
      phoneNumber,
      caller: {
        phoneNumber,
        name: `Test Caller ${phoneNumber}`
      },
      variables: {
        ...variables,
        callDirection: 'INBOUND',
        testExecution: true
      },
      currentTime: new Date()
    };

    console.log(`🧪 Test executing flow ${flowId} with context:`, context);

    const result = await flowExecutionEngine.executeFlow(flowId, context);

    res.json({
      success: true,
      message: 'Flow execution completed',
      executionResult: result,
      context: context
    });

  } catch (error) {
    console.error('Error executing flow:', error);
    res.status(500).json({ 
      error: 'Failed to execute flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};