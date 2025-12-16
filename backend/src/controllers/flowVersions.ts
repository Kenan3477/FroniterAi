import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createNodeSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  x: z.number(),
  y: z.number(),
  isEntry: z.boolean().optional().default(false),
  config: z.any().optional().default({}),
});

const updateNodeSchema = z.object({
  label: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  isEntry: z.boolean().optional(),
  config: z.any().optional(),
});

const createEdgeSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  sourcePort: z.string().min(1),
  label: z.string().optional(),
});

const updateEdgeSchema = z.object({
  label: z.string().optional(),
  sourcePort: z.string().optional(),
});

/**
 * GET /api/flows/:flowId/versions/:versionId
 * Get full flow version with nodes and edges
 */
export const getFlowVersion = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId } = req.params;

    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
      },
      include: {
        nodes: true,
        edges: true,
        flow: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Flow version not found' });
    }

    // Parse JSON config strings back to objects
    const nodes = (flowVersion as any).nodes.map((node: any) => ({
      ...node,
      config: typeof node.config === 'string' ? JSON.parse(node.config) : node.config,
    }));

    res.json({
      id: flowVersion.id,
      flowId: flowVersion.flowId,
      versionNumber: flowVersion.versionNumber,
      isActive: flowVersion.isActive,
      isDraft: flowVersion.isDraft,
      createdAt: flowVersion.createdAt,
      publishedAt: flowVersion.publishedAt,
      flow: (flowVersion as any).flow,
      nodes,
      edges: (flowVersion as any).edges,
    });
  } catch (error) {
    console.error('Error fetching flow version:', error);
    res.status(500).json({ error: 'Failed to fetch flow version' });
  }
};

/**
 * POST /api/flows/:flowId/versions/:versionId/nodes
 * Create a new node in the flow version
 */
export const createNode = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId } = req.params;
    const validatedData = createNodeSchema.parse(req.body);

    // Verify version exists and is a draft
    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
        isDraft: true,
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Draft flow version not found' });
    }

    const node = await prisma.flowNode.create({
      data: {
        flowVersionId: versionId,
        type: validatedData.type,
        label: validatedData.label,
        category: validatedData.category,
        x: validatedData.x,
        y: validatedData.y,
        isEntry: validatedData.isEntry,
        config: JSON.stringify(validatedData.config),
      },
    });

    res.status(201).json({
      ...node,
      config: JSON.parse(node.config),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Failed to create node' });
  }
};

/**
 * PATCH /api/flows/:flowId/versions/:versionId/nodes/:nodeId
 * Update a node in the flow version
 */
export const updateNode = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId, nodeId } = req.params;
    const validatedData = updateNodeSchema.parse(req.body);

    // Verify version exists and is a draft
    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
        isDraft: true,
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Draft flow version not found' });
    }

    // Build update data
    const updateData: any = {};
    if (validatedData.label !== undefined) updateData.label = validatedData.label;
    if (validatedData.x !== undefined) updateData.x = validatedData.x;
    if (validatedData.y !== undefined) updateData.y = validatedData.y;
    if (validatedData.isEntry !== undefined) updateData.isEntry = validatedData.isEntry;
    if (validatedData.config !== undefined) updateData.config = JSON.stringify(validatedData.config);

    const node = await prisma.flowNode.update({
      where: {
        id: nodeId,
        flowVersionId: versionId,
      },
      data: updateData,
    });

    res.json({
      ...node,
      config: JSON.parse(node.config),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
};

/**
 * DELETE /api/flows/:flowId/versions/:versionId/nodes/:nodeId
 * Delete a node from the flow version
 */
export const deleteNode = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId, nodeId } = req.params;

    // Verify version exists and is a draft
    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
        isDraft: true,
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Draft flow version not found' });
    }

    // Delete related edges first
    await prisma.flowEdge.deleteMany({
      where: {
        flowVersionId: versionId,
        OR: [
          { sourceNodeId: nodeId },
          { targetNodeId: nodeId },
        ],
      },
    });

    // Delete the node
    await prisma.flowNode.delete({
      where: {
        id: nodeId,
        flowVersionId: versionId,
      },
    });

    res.json({ success: true, message: 'Node deleted successfully' });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
};

/**
 * POST /api/flows/:flowId/versions/:versionId/edges
 * Create a new edge in the flow version
 */
export const createEdge = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId } = req.params;
    const validatedData = createEdgeSchema.parse(req.body);

    // Verify version exists and is a draft
    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
        isDraft: true,
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Draft flow version not found' });
    }

    // Verify source and target nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      prisma.flowNode.findFirst({
        where: { id: validatedData.sourceNodeId, flowVersionId: versionId }
      }),
      prisma.flowNode.findFirst({
        where: { id: validatedData.targetNodeId, flowVersionId: versionId }
      })
    ]);

    if (!sourceNode || !targetNode) {
      return res.status(400).json({ error: 'Source or target node not found' });
    }

    const edge = await prisma.flowEdge.create({
      data: {
        flowVersionId: versionId,
        sourceNodeId: validatedData.sourceNodeId,
        targetNodeId: validatedData.targetNodeId,
        sourcePort: validatedData.sourcePort,
        label: validatedData.label,
      },
    });

    res.status(201).json(edge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error creating edge:', error);
    res.status(500).json({ error: 'Failed to create edge' });
  }
};

/**
 * PATCH /api/flows/:flowId/versions/:versionId/edges/:edgeId
 * Update an edge in the flow version
 */
export const updateEdge = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId, edgeId } = req.params;
    const validatedData = updateEdgeSchema.parse(req.body);

    // Verify version exists and is a draft
    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
        isDraft: true,
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Draft flow version not found' });
    }

    // Build update data
    const updateData: any = {};
    if (validatedData.label !== undefined) updateData.label = validatedData.label;
    if (validatedData.sourcePort !== undefined) updateData.sourcePort = validatedData.sourcePort;

    const edge = await prisma.flowEdge.update({
      where: {
        id: edgeId,
        flowVersionId: versionId,
      },
      data: updateData,
    });

    res.json(edge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error updating edge:', error);
    res.status(500).json({ error: 'Failed to update edge' });
  }
};

/**
 * DELETE /api/flows/:flowId/versions/:versionId/edges/:edgeId
 * Delete an edge from the flow version
 */
export const deleteEdge = async (req: Request, res: Response) => {
  try {
    const { flowId, versionId, edgeId } = req.params;

    // Verify version exists and is a draft
    const flowVersion = await prisma.flowVersion.findFirst({
      where: {
        id: versionId,
        flowId: flowId,
        isDraft: true,
      },
    });

    if (!flowVersion) {
      return res.status(404).json({ error: 'Draft flow version not found' });
    }

    await prisma.flowEdge.delete({
      where: {
        id: edgeId,
        flowVersionId: versionId,
      },
    });

    res.json({ success: true, message: 'Edge deleted successfully' });
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
};