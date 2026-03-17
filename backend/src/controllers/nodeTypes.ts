import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/flow-node-types
 * Get all node type definitions grouped by category
 */
export const getNodeTypes = async (req: Request, res: Response) => {
  try {
    const nodeTypes = await prisma.nodeTypeDefinition.findMany({
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // Group by category
    const groupedNodeTypes: Record<string, any[]> = {};
    
    for (const nodeType of nodeTypes) {
      if (!groupedNodeTypes[nodeType.category]) {
        groupedNodeTypes[nodeType.category] = [];
      }
      
      groupedNodeTypes[nodeType.category].push({
        ...nodeType,
        schema: typeof nodeType.schema === 'string' ? JSON.parse(nodeType.schema) : nodeType.schema,
        ports: typeof nodeType.ports === 'string' ? JSON.parse(nodeType.ports) : nodeType.ports,
      });
    }

    res.json(groupedNodeTypes);
  } catch (error) {
    console.error('Error fetching node types:', error);
    res.status(500).json({ error: 'Failed to fetch node types' });
  }
};

/**
 * GET /api/flow-node-types/:type
 * Get a specific node type definition by type
 */
export const getNodeType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const nodeType = await prisma.nodeTypeDefinition.findUnique({
      where: { type }
    });

    if (!nodeType) {
      return res.status(404).json({ error: 'Node type not found' });
    }

    res.json({
      ...nodeType,
      schema: typeof nodeType.schema === 'string' ? JSON.parse(nodeType.schema) : nodeType.schema,
      ports: typeof nodeType.ports === 'string' ? JSON.parse(nodeType.ports) : nodeType.ports,
    });
  } catch (error) {
    console.error('Error fetching node type:', error);
    res.status(500).json({ error: 'Failed to fetch node type' });
  }
};