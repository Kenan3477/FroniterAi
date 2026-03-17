import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const executeFlowSchema = z.object({
  flowId: z.string(),
  callerId: z.string().optional(),
  cli: z.string().optional(),
  context: z.record(z.any()).optional(),
});

const flowStepSchema = z.object({
  executionId: z.string(),
  nodeId: z.string(),
  input: z.record(z.any()).optional(),
});

interface FlowExecutionContext {
  callerId?: string;
  cli?: string;
  currentTime: Date;
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  variables: Record<string, any>;
  currentNodeId?: string;
}

/**
 * POST /api/flow-execution/start
 * Start flow execution (triggered by inbound call)
 */
export const startFlowExecution = async (req: Request, res: Response) => {
  try {
    const { flowId, callerId, cli, context } = executeFlowSchema.parse(req.body);

    // Get the active flow version
    const flow = await prisma.flow.findUnique({
      where: { id: flowId, status: 'ACTIVE' },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!flow || flow.versions.length === 0) {
      return res.status(404).json({ error: 'Active flow not found' });
    }

    const version = flow.versions[0];
    const entryNode = version.nodes.find((node: any) => 
      node.isEntry || 
      node.type === 'eventTrigger' || 
      node.type.startsWith('event:') ||
      node.category === 'EventTrigger'
    );

    if (!entryNode) {
      return res.status(400).json({ error: 'No entry node found in flow' });
    }

    // Create execution record
    const execution = await prisma.flowRun.create({
      data: {
        flowVersionId: version.id,
        externalRef: `call:${callerId || cli}`,
        status: 'RUNNING',
        context: JSON.stringify({
          callerId,
          cli,
          startTime: new Date().toISOString(),
          currentNodeId: entryNode.id,
          ...context,
        }),
      },
    });

    // Execute the first node
    const executionContext: FlowExecutionContext = {
      callerId,
      cli,
      currentTime: new Date(),
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'Europe/London',
      },
      variables: context || {},
      currentNodeId: entryNode.id,
    };

    const result = await executeNode(entryNode, execution.id, executionContext, version);

    res.json({
      success: true,
      executionId: execution.id,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error starting flow execution:', error);
    res.status(500).json({ error: 'Failed to start flow execution' });
  }
};

/**
 * POST /api/flow-execution/step
 * Continue flow execution (handle user input)
 */
export const continueFlowExecution = async (req: Request, res: Response) => {
  try {
    const { executionId, nodeId, input } = flowStepSchema.parse(req.body);

    const execution = await prisma.flowRun.findUnique({
      where: { id: executionId },
      include: {
        flowVersion: {
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const currentNode = execution.flowVersion.nodes.find((node: any) => node.id === nodeId);
    if (!currentNode) {
      return res.status(400).json({ error: 'Node not found' });
    }

    const context: FlowExecutionContext = {
      ...JSON.parse(execution.context),
      currentTime: new Date(),
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'Europe/London',
      },
      variables: {
        ...JSON.parse(execution.context).variables,
        ...input,
      },
    };

    const result = await executeNode(currentNode, executionId, context, execution.flowVersion);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error continuing flow execution:', error);
    res.status(500).json({ error: 'Failed to continue flow execution' });
  }
};

/**
 * Execute a specific node based on its type
 */
async function executeNode(
  node: any, 
  executionId: string, 
  context: FlowExecutionContext, 
  version: any
): Promise<any> {
  const nodeConfig = typeof node.config === 'string' ? JSON.parse(node.config) : node.config || {};
  const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data || {};

  console.log(`🚀 Executing node: ${nodeData.label || node.type} (ID: ${node.id})`);

  // Handle different node type formats
  const nodeType = node.type.includes(':') ? node.type.split(':')[0] : node.type;
  const nodeSubType = node.type.includes(':') ? node.type.split(':')[1] : null;

  switch (nodeType) {
    case 'event':
    case 'eventTrigger':
      return await executeEventTrigger(node, executionId, context, version, nodeConfig);
    
    case 'condition':
    case 'conditional':
      return await executeConditional(node, executionId, context, version, nodeConfig);
    
    case 'action':
      return await executeAction(node, executionId, context, version, nodeConfig);
    
    default:
      throw new Error(`Unknown node type: ${node.type} (parsed as: ${nodeType})`);
  }
}

/**
 * Execute Event Trigger (Inbound Call)
 */
async function executeEventTrigger(
  node: any, 
  executionId: string, 
  context: FlowExecutionContext, 
  version: any,
  nodeConfig: any
): Promise<any> {
  console.log(`📞 Inbound call received on CLI: ${context.cli}`);
  
  // Find next node
  const nextEdge = version.edges.find((edge: any) => edge.sourceNodeId === node.id);
  if (nextEdge) {
    const nextNode = version.nodes.find((n: any) => n.id === nextEdge.targetNodeId);
    if (nextNode) {
      return await executeNode(nextNode, executionId, context, version);
    }
  }

  return { action: 'call_received', nextAction: 'end' };
}

/**
 * Execute Conditional Node (Business Hours, IVR)
 */
async function executeConditional(
  node: any, 
  executionId: string, 
  context: FlowExecutionContext, 
  version: any,
  nodeConfig: any
): Promise<any> {
  const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data || {};
  
  if (nodeData.subType === 'businessHours' || nodeData.label === '9-5') {
    // Business Hours Check
    const isWithinHours = checkBusinessHours(context.currentTime, context.businessHours);
    
    console.log(`🕒 Business hours check: ${isWithinHours ? 'Within Hours' : 'Outside Hours'}`);

    // Find appropriate next edge
    const edges = version.edges.filter((edge: any) => edge.sourceNodeId === node.id);
    let targetEdge;
    
    if (isWithinHours) {
      targetEdge = edges.find((edge: any) => edge.label === 'Within Hours') || edges[0];
    } else {
      targetEdge = edges.find((edge: any) => edge.label === 'Outside Hours') || edges[1];
    }

    if (targetEdge) {
      const nextNode = version.nodes.find((n: any) => n.id === targetEdge.targetNodeId);
      if (nextNode) {
        return await executeNode(nextNode, executionId, context, version);
      }
    }

    return { 
      action: 'business_hours_check', 
      result: isWithinHours ? 'within_hours' : 'outside_hours',
      nextAction: 'end' 
    };

  } else if (nodeData.subType === 'ivr' || nodeData.label === 'IVR') {
    // IVR Menu
    console.log(`🎵 Presenting IVR menu with digits: ${nodeData.enabledDigits || [1,2,3,4]}`);

    return {
      action: 'present_ivr',
      audioFile: nodeData.audioFile || 'Flash Welcome IVR',
      enabledDigits: nodeData.enabledDigits || [1,2,3,4],
      timeout: nodeData.timeout || 5,
      waitingForInput: true,
      nextAction: 'wait_for_digit',
    };
  }

  return { action: 'conditional_unknown', nextAction: 'end' };
}

/**
 * Execute Action Node (Play Audio, Transfer)
 */
async function executeAction(
  node: any, 
  executionId: string, 
  context: FlowExecutionContext, 
  version: any,
  nodeConfig: any
): Promise<any> {
  const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data || {};
  
  if (nodeData.subType === 'playAudio' || nodeData.label === 'Flash OOH') {
    // Play Audio
    console.log(`🔊 Playing audio: ${nodeData.audioFileName || 'No Name OOH New New'}`);

    return {
      action: 'play_audio',
      audioFile: nodeData.audioFileName || 'No Name OOH New New',
      audioType: nodeData.audioType || 'Audio File',
      nextAction: 'hangup',
    };

  } else if (nodeData.subType === 'externalTransfer' || nodeData.label === 'YourGoTo') {
    // External Transfer
    console.log(`📞 External transfer to: ${nodeData.ddi || '7+442080501954'}`);

    return {
      action: 'external_transfer',
      ddi: nodeData.ddi || '7+442080501954',
      transferType: 'external',
      nextAction: 'transfer_complete',
    };

  } else if (nodeData.subType === 'queueTransfer' || nodeData.label === 'Customer Services') {
    // Queue Transfer
    console.log(`📋 Queue transfer to: ${nodeData.inboundQueue || 'CustomerServices'}`);

    return {
      action: 'queue_transfer',
      queue: nodeData.inboundQueue || 'CustomerServices',
      transferType: 'queue',
      nextAction: 'queue_wait',
    };
  }

  return { action: 'action_unknown', nextAction: 'end' };
}

/**
 * Check if current time is within business hours
 */
function checkBusinessHours(currentTime: Date, businessHours: any): boolean {
  const hour = currentTime.getHours();
  const startHour = parseInt(businessHours.start.split(':')[0]);
  const endHour = parseInt(businessHours.end.split(':')[0]);
  
  return hour >= startHour && hour < endHour;
}

/**
 * Handle IVR digit input
 */
export const handleIVRInput = async (req: Request, res: Response) => {
  try {
    const { executionId, digit } = req.body;

    const execution = await prisma.flowRun.findUnique({
      where: { id: executionId },
      include: {
        flowVersion: {
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const executionContext = JSON.parse(execution.context);
    
    console.log(`⌨️  IVR digit pressed: ${digit}`);

    // Find the edge corresponding to the digit
    const edges = execution.flowVersion.edges.filter((edge: any) => 
      edge.sourceNodeId === executionContext.currentNodeId
    );

    let targetEdge;
    switch (digit) {
      case '1':
        targetEdge = edges.find((edge: any) => edge.label === 'Option 1');
        break;
      case '2':
        targetEdge = edges.find((edge: any) => edge.label === 'Option 2');
        break;
      case '3':
        targetEdge = edges.find((edge: any) => edge.label === 'Option 3');
        break;
      case '4':
        targetEdge = edges.find((edge: any) => edge.label === 'Option 4');
        break;
      default:
        return res.status(400).json({ error: 'Invalid digit input' });
    }

    if (targetEdge) {
      const nextNode = execution.flowVersion.nodes.find((n: any) => n.id === targetEdge.targetNodeId);
      if (nextNode) {
        const context: FlowExecutionContext = {
          ...executionContext,
          currentTime: new Date(),
          businessHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'Europe/London',
          },
          variables: {
            ...executionContext.variables,
            selectedOption: digit,
          },
          currentNodeId: nextNode.id,
        };

        const result = await executeNode(nextNode, executionId, context, execution.flowVersion);
        
        // Update current node in execution
        await prisma.flowRun.update({
          where: { id: executionId },
          data: { 
            context: JSON.stringify({
              ...executionContext,
              currentNodeId: nextNode.id,
              selectedOption: digit,
            })
          },
        });

        return res.json({
          success: true,
          result,
        });
      }
    }

    res.status(400).json({ error: 'No path found for digit input' });
  } catch (error) {
    console.error('Error handling IVR input:', error);
    res.status(500).json({ error: 'Failed to handle IVR input' });
  }
};