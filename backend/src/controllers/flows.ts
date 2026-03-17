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

const updateNodeSchema = z.object({
  label: z.string().optional(),
  config: z.record(z.any()).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const validateFlowSchema = z.object({
  skipWarnings: z.boolean().optional().default(false),
});

const simulateFlowSchema = z.object({
  scenario: z.string().optional().default('default'),
  mockData: z.record(z.any()).optional(),
});

// Mock current user - in real app this would come from auth
const CURRENT_USER_ID = 1;

/**
 * GET /api/flows
 * List all flows with optional filtering
 */
export const getFlows = async (req: Request, res: Response) => {
  try {
    const { search, status, sort = 'updated_desc' } = req.query;

    // Use raw SQL to bypass Prisma schema issues
    let query = 'SELECT id, name, description, status, "createdAt", "updatedAt" FROM flows WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    } else {
      // By default, exclude archived flows
      query += ` AND status != 'ARCHIVED'`;
    }

    // Add ordering
    switch (sort) {
      case 'name_asc':
        query += ' ORDER BY name ASC';
        break;
      case 'name_desc':
        query += ' ORDER BY name DESC';
        break;
      case 'created_desc':
        query += ' ORDER BY "createdAt" DESC';
        break;
      case 'created_asc':
        query += ' ORDER BY "createdAt" ASC';
        break;
      default:
        query += ' ORDER BY "updatedAt" DESC';
    }

    const flows = await prisma.$queryRawUnsafe(query, ...params) as any[];

    // Transform to API format
    const flowsData = (flows as any[]).map((flow: any) => ({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      status: flow.status,
      latestVersionNumber: 1, // Default since we don't have versions yet
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

    // Use the current user ID directly (in real app this would come from auth)
    const userId = CURRENT_USER_ID;

    const flow = await prisma.flow.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        status: 'INACTIVE',
        createdByUserId: userId,
        organizationId: '1', // Default organization for now
        visibility: 'PRIVATE',
        isTemplate: false,
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

/**
 * PUT /api/flows/:flowId/nodes/:nodeId
 * Update a specific node's configuration
 */
export const updateFlowNode = async (req: Request, res: Response) => {
  try {
    const { flowId, nodeId } = req.params;
    const validatedData = updateNodeSchema.parse(req.body);

    // First, find the flow and get its draft version
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { isDraft: true },
          include: {
            nodes: true
          }
        }
      }
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const draftVersion = flow.versions[0];
    if (!draftVersion) {
      return res.status(400).json({ error: 'No draft version found for this flow' });
    }

    // Find the specific node
    const node = draftVersion.nodes.find(n => n.id === nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.label !== undefined) {
      updateData.label = validatedData.label;
    }
    if (validatedData.config !== undefined) {
      updateData.config = JSON.stringify(validatedData.config);
    }
    if (validatedData.x !== undefined) {
      updateData.x = validatedData.x;
    }
    if (validatedData.y !== undefined) {
      updateData.y = validatedData.y;
    }

    // Update the node
    const updatedNode = await prisma.flowNode.update({
      where: { id: nodeId },
      data: updateData
    });

    res.json({
      success: true,
      node: {
        id: updatedNode.id,
        label: updatedNode.label,
        config: typeof updatedNode.config === 'string' 
          ? JSON.parse(updatedNode.config) 
          : updatedNode.config,
        x: updatedNode.x,
        y: updatedNode.y,
        type: updatedNode.type,
        category: updatedNode.category
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error updating flow node:', error);
    res.status(500).json({ 
      error: 'Failed to update node',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/flows/:flowId/validate
 * Validate flow for completeness and logical errors
 */
export const validateFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const { skipWarnings } = validateFlowSchema.parse(req.body);

    // Get the flow with its draft version
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { isDraft: true },
          include: {
            nodes: true,
            edges: true
          }
        }
      }
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const draftVersion = flow.versions[0];
    if (!draftVersion) {
      return res.status(400).json({ error: 'No draft version found for this flow' });
    }

    const errors: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING'; nodeId?: string }> = [];
    const warnings: Array<{ code: string; message: string; nodeId?: string }> = [];

    // Validation Rule 1: Must have at least one entry node
    const entryNodes = draftVersion.nodes.filter(node => {
      try {
        const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
        return node.isEntry || config?.isEntry;
      } catch {
        return node.isEntry;
      }
    });

    if (entryNodes.length === 0) {
      errors.push({
        code: 'NO_ENTRY_NODE',
        message: 'Flow must have at least one entry node to handle incoming calls',
        severity: 'ERROR'
      });
    }

    // Validation Rule 2: Must have at least one exit node (End Call or Transfer)
    const exitNodes = draftVersion.nodes.filter(node => {
      return node.type === 'endCall' || node.type === 'externalTransfer' || node.type === 'queueTransfer';
    });

    if (exitNodes.length === 0) {
      errors.push({
        code: 'NO_EXIT_NODE',
        message: 'Flow must have at least one exit node (End Call, External Transfer, or Queue Transfer)',
        severity: 'ERROR'
      });
    }

    // Validation Rule 3: Check for orphaned nodes (nodes with no incoming edges)
    const nodeIds = draftVersion.nodes.map(n => n.id);
    const targetNodeIds = draftVersion.edges.map(e => e.targetNodeId);
    const orphanedNodes = draftVersion.nodes.filter(node => {
      return !node.isEntry && !targetNodeIds.includes(node.id);
    });

    orphanedNodes.forEach(node => {
      warnings.push({
        code: 'ORPHANED_NODE',
        message: `Node "${node.label}" has no incoming connections and cannot be reached`,
        nodeId: node.id
      });
    });

    // Validation Rule 4: Check for unreachable nodes (nodes with no outgoing edges that aren't exit nodes)
    const sourceNodeIds = draftVersion.edges.map(e => e.sourceNodeId);
    const unreachableNodes = draftVersion.nodes.filter(node => {
      const isExitNode = node.type === 'endCall' || node.type === 'externalTransfer' || node.type === 'queueTransfer';
      return !isExitNode && !sourceNodeIds.includes(node.id);
    });

    unreachableNodes.forEach(node => {
      warnings.push({
        code: 'UNREACHABLE_NODE',
        message: `Node "${node.label}" has no outgoing connections - calls may get stuck here`,
        nodeId: node.id
      });
    });

    // Validation Rule 5: Check for missing required configurations
    for (const node of draftVersion.nodes) {
      let config;
      try {
        config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config || {};
      } catch {
        config = {};
      }

      switch (node.type) {
        case 'externalTransfer':
          if (!config.phoneNumber && !config.ddi) {
            errors.push({
              code: 'MISSING_PHONE_NUMBER',
              message: `External Transfer node "${node.label}" requires a phone number`,
              severity: 'ERROR',
              nodeId: node.id
            });
          }
          break;
        case 'playAudio':
          if (!config.audioUrl && !config.audioFile) {
            errors.push({
              code: 'MISSING_AUDIO_FILE',
              message: `Audio Playback node "${node.label}" requires an audio file`,
              severity: 'ERROR',
              nodeId: node.id
            });
          }
          break;
        case 'textToSpeech':
          if (!config.text || config.text.trim().length === 0) {
            errors.push({
              code: 'MISSING_TEXT',
              message: `Text-to-Speech node "${node.label}" requires text content`,
              severity: 'ERROR',
              nodeId: node.id
            });
          }
          break;
        case 'ivr':
          if (!config.options || !Array.isArray(config.options) || config.options.length === 0) {
            errors.push({
              code: 'MISSING_IVR_OPTIONS',
              message: `IVR Menu node "${node.label}" requires at least one menu option`,
              severity: 'ERROR',
              nodeId: node.id
            });
          }
          break;
      }
    }

    // Validation Rule 6: Check for invalid edge references
    const invalidEdges = draftVersion.edges.filter(edge => {
      return !nodeIds.includes(edge.sourceNodeId) || !nodeIds.includes(edge.targetNodeId);
    });

    invalidEdges.forEach(edge => {
      errors.push({
        code: 'INVALID_EDGE',
        message: `Edge connects to non-existent nodes`,
        severity: 'ERROR'
      });
    });

    // Determine overall validation status
    const isValid = errors.length === 0;
    const hasWarnings = warnings.length > 0;

    // Update flow validation status in database
    await prisma.flow.update({
      where: { id: flowId },
      data: {
        status: isValid ? 'INACTIVE' : 'DRAFT', // Only inactive flows can be deployed
      }
    });

    res.json({
      isValid,
      hasWarnings,
      errors,
      warnings,
      validatedAt: new Date().toISOString(),
      summary: {
        totalNodes: draftVersion.nodes.length,
        totalEdges: draftVersion.edges.length,
        entryNodes: entryNodes.length,
        exitNodes: exitNodes.length,
        errorCount: errors.length,
        warningCount: warnings.length
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error validating flow:', error);
    res.status(500).json({ 
      error: 'Failed to validate flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/flows/:flowId/simulate
 * Simulate flow execution with mock data
 */
export const simulateFlow = async (req: Request, res: Response) => {
  try {
    const { flowId } = req.params;
    const { scenario, mockData } = simulateFlowSchema.parse(req.body);

    // Get the flow with its draft version
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { isDraft: true },
          include: {
            nodes: true,
            edges: true
          }
        }
      }
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const draftVersion = flow.versions[0];
    if (!draftVersion) {
      return res.status(400).json({ error: 'No draft version found for this flow' });
    }

    // Create mock execution context based on scenario
    const mockContext: any = {
      callId: `sim-${Date.now()}`,
      callerNumber: mockData?.callerNumber || '+442012345678',
      calledNumber: mockData?.calledNumber || '+442046343130',
      timestamp: new Date().toISOString(),
      scenario: scenario,
      ...mockData
    };

    // Define scenario-based mock conditions
    const scenarioConditions = {
      'default': {
        businessHours: true,
        queueStatus: 'open',
        agentsAvailable: 3
      },
      'out_of_hours': {
        businessHours: false,
        queueStatus: 'closed',
        agentsAvailable: 0
      },
      'busy_queue': {
        businessHours: true,
        queueStatus: 'busy',
        agentsAvailable: 0
      },
      'weekend': {
        businessHours: false,
        queueStatus: 'closed',
        agentsAvailable: 0
      }
    };

    const conditions = scenarioConditions[scenario as keyof typeof scenarioConditions] || scenarioConditions.default;
    mockContext.conditions = conditions;

    // Simulate flow execution step by step
    const executionSteps: Array<{
      nodeId: string;
      nodeType: string;
      nodeLabel: string;
      action: string;
      result: string;
      duration: number;
      nextNodeId?: string;
    }> = [];

    // Find entry node
    const entryNode = draftVersion.nodes.find(node => {
      try {
        const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
        return node.isEntry || config?.isEntry;
      } catch {
        return node.isEntry;
      }
    });

    if (!entryNode) {
      return res.status(400).json({ error: 'No entry node found for simulation' });
    }

    let currentNode: typeof entryNode | null = entryNode;
    let stepCount = 0;
    const maxSteps = 20; // Prevent infinite loops

    while (currentNode && stepCount < maxSteps) {
      stepCount++;
      const startTime = Date.now();

      let config;
      try {
        config = typeof currentNode.config === 'string' ? JSON.parse(currentNode.config) : currentNode.config || {};
      } catch {
        config = {};
      }

      let action = '';
      let result = '';
      let nextNodeId: string | undefined;
      let simulatedDuration = 100; // Base duration in ms

      // Simulate node execution based on type
      switch (currentNode.type) {
        case 'eventTrigger':
          action = 'Incoming call received';
          result = `Call from ${mockContext.callerNumber} to ${mockContext.calledNumber}`;
          simulatedDuration = 50;
          break;

        case 'businessHours':
          action = 'Check business hours';
          if (conditions.businessHours) {
            result = 'Within business hours - continue';
            // Find 'true' path edge
            const trueEdge = draftVersion.edges.find(e => 
              e.sourceNodeId === currentNode!.id && e.sourcePort === 'true'
            );
            nextNodeId = trueEdge?.targetNodeId;
          } else {
            result = 'Outside business hours - route to out of hours message';
            // Find 'false' path edge  
            const falseEdge = draftVersion.edges.find(e => 
              e.sourceNodeId === currentNode!.id && e.sourcePort === 'false'
            );
            nextNodeId = falseEdge?.targetNodeId;
          }
          simulatedDuration = 100;
          break;

        case 'callerCheck':
          action = 'Check caller information';
          const isKnownCaller = mockContext.callerNumber.includes('2012345'); // Simple logic
          if (isKnownCaller) {
            result = 'Known caller - priority routing';
            const trueEdge = draftVersion.edges.find(e => 
              e.sourceNodeId === currentNode!.id && e.sourcePort === 'true'
            );
            nextNodeId = trueEdge?.targetNodeId;
          } else {
            result = 'Unknown caller - standard routing';
            const falseEdge = draftVersion.edges.find(e => 
              e.sourceNodeId === currentNode!.id && e.sourcePort === 'false'
            );
            nextNodeId = falseEdge?.targetNodeId;
          }
          simulatedDuration = 200;
          break;

        case 'playAudio':
          action = 'Play audio message';
          result = `Playing: ${config.audioFile || 'Welcome message'}`;
          simulatedDuration = parseInt(config.duration) || 3000;
          break;

        case 'textToSpeech':
          action = 'Text-to-speech announcement';
          result = `Speaking: "${config.text || 'Default message'}"`;
          simulatedDuration = (config.text?.length || 20) * 100; // ~100ms per character
          break;

        case 'ivr':
          action = 'Present IVR menu';
          result = `Menu presented with ${config.options?.length || 0} options`;
          const selectedOption = mockData?.ivrSelection || '1';
          const selectedEdge = draftVersion.edges.find(e => 
            e.sourceNodeId === currentNode!.id && e.sourcePort === selectedOption
          );
          nextNodeId = selectedEdge?.targetNodeId;
          simulatedDuration = 5000;
          break;

        case 'collectInput':
          action = 'Collect caller input';
          result = `Collected: ${mockData?.userInput || 'No input provided'}`;
          simulatedDuration = 3000;
          break;

        case 'queueTransfer':
          action = 'Transfer to queue';
          if (conditions.agentsAvailable > 0) {
            result = `Transferred to queue - ${conditions.agentsAvailable} agents available`;
          } else {
            result = 'Queue busy - caller placed in waiting';
          }
          simulatedDuration = 1000;
          break;

        case 'externalTransfer':
          action = 'External transfer';
          result = `Transferring to ${config.phoneNumber || config.ddi || 'external number'}`;
          simulatedDuration = 2000;
          break;

        case 'endCall':
          action = 'End call';
          result = 'Call terminated';
          simulatedDuration = 100;
          break;

        default:
          action = 'Unknown node type';
          result = `Simulated execution of ${currentNode.type}`;
          simulatedDuration = 500;
      }

      executionSteps.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        nodeLabel: currentNode.label,
        action,
        result,
        duration: simulatedDuration,
        nextNodeId
      });

      // Move to next node if specified
      if (nextNodeId) {
        currentNode = draftVersion.nodes.find(n => n.id === nextNodeId) || null;
      } else {
        // Look for default outgoing edge
        const defaultEdge = draftVersion.edges.find(e => e.sourceNodeId === currentNode!.id);
        if (defaultEdge) {
          currentNode = draftVersion.nodes.find(n => n.id === defaultEdge.targetNodeId) || null;
        } else {
          currentNode = null; // End of flow
        }
      }

      // End execution for terminal nodes
      if (currentNode?.type === 'endCall' || currentNode?.type === 'externalTransfer') {
        break;
      }
    }

    const totalDuration = executionSteps.reduce((sum, step) => sum + step.duration, 0);
    const finalOutcome = executionSteps[executionSteps.length - 1]?.action || 'Flow incomplete';

    res.json({
      simulationId: `sim-${Date.now()}`,
      scenario,
      mockContext,
      executionPath: executionSteps,
      summary: {
        totalSteps: executionSteps.length,
        totalDuration,
        finalOutcome,
        successful: stepCount < maxSteps
      },
      simulatedAt: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error simulating flow:', error);
    res.status(500).json({ 
      error: 'Failed to simulate flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};