import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface FlowExecutionContext {
  callId: string;
  phoneNumber: string;
  caller: {
    id?: string;
    name?: string;
    phoneNumber: string;
  };
  variables: Record<string, any>;
  currentTime: Date;
  timezone?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  label: string;
  category: string;
  config: any;
  isEntry: boolean;
  x: number;
  y: number;
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort?: string;
  label?: string;
}

export interface FlowExecutionResult {
  success: boolean;
  nextAction?: string;
  variables?: Record<string, any>;
  error?: string;
  nodeResults?: Array<{
    nodeId: string;
    type: string;
    success: boolean;
    output?: any;
    error?: string;
  }>;
}

export class FlowExecutionEngine extends EventEmitter {
  private executingFlows = new Map<string, boolean>();

  /**
   * Execute a flow for an inbound call
   */
  async executeFlow(flowId: string, context: FlowExecutionContext): Promise<FlowExecutionResult> {
    console.log(`🚀 Executing flow ${flowId} for call ${context.callId}`);

    // Prevent concurrent execution of same flow for same call
    const executionKey = `${flowId}-${context.callId}`;
    if (this.executingFlows.get(executionKey)) {
      return {
        success: false,
        error: 'Flow already executing for this call'
      };
    }

    this.executingFlows.set(executionKey, true);

    try {
      // Get the active flow version
      const flow = await prisma.flow.findUnique({
        where: { 
          id: flowId,
          status: 'ACTIVE'
        },
        include: {
          versions: {
            where: { isActive: true },
            include: {
              nodes: true,
              edges: true
            }
          }
        }
      });

      if (!flow || !flow.versions || flow.versions.length === 0) {
        return {
          success: false,
          error: 'Active flow version not found'
        };
      }

      const version = flow.versions[0];
      const nodes = version.nodes as unknown as FlowNode[];
      const edges = version.edges as unknown as FlowEdge[];

      // Find entry node
      const entryNode = nodes.find(node => node.isEntry);
      if (!entryNode) {
        return {
          success: false,
          error: 'No entry node found in flow'
        };
      }

      // Log flow execution start
      await this.logFlowExecution(flowId, context.callId, 'STARTED', {
        entryNodeId: entryNode.id,
        context: context.variables
      });

      this.emit('flowExecutionStarted', { flowId, callId: context.callId, entryNode });

      // Execute the flow starting from entry node
      const result = await this.executeNodeRecursive(
        entryNode, 
        nodes, 
        edges, 
        context, 
        new Set()
      );

      // Log flow execution completion
      await this.logFlowExecution(flowId, context.callId, 
        result.success ? 'COMPLETED' : 'FAILED', 
        {
          result,
          finalVariables: context.variables
        }
      );

      this.emit('flowExecutionCompleted', { 
        flowId, 
        callId: context.callId, 
        result,
        context 
      });

      return result;

    } catch (error) {
      console.error(`❌ Flow execution error for ${flowId}:`, error);
      
      await this.logFlowExecution(flowId, context.callId, 'ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    } finally {
      this.executingFlows.delete(executionKey);
    }
  }

  /**
   * Execute a single node and continue to the next
   */
  private async executeNodeRecursive(
    currentNode: FlowNode,
    allNodes: FlowNode[],
    allEdges: FlowEdge[],
    context: FlowExecutionContext,
    visitedNodes: Set<string>
  ): Promise<FlowExecutionResult> {
    
    // Prevent infinite loops
    if (visitedNodes.has(currentNode.id)) {
      return {
        success: false,
        error: `Infinite loop detected at node ${currentNode.id}`
      };
    }

    visitedNodes.add(currentNode.id);
    console.log(`🎯 Executing node: ${currentNode.type} - ${currentNode.label}`);

    try {
      // Execute the current node
      const nodeResult = await this.executeNode(currentNode, context);

      // Log node execution
      await this.logNodeExecution(
        currentNode.id, 
        context.callId, 
        nodeResult.success ? 'COMPLETED' : 'FAILED',
        {
          input: context.variables,
          output: nodeResult.output,
          error: nodeResult.error
        }
      );

      if (!nodeResult.success) {
        return {
          success: false,
          error: nodeResult.error,
          nodeResults: [{ 
            nodeId: currentNode.id, 
            type: currentNode.type, 
            success: false, 
            error: nodeResult.error 
          }]
        };
      }

      // Update context with node output
      if (nodeResult.output) {
        Object.assign(context.variables, nodeResult.output);
      }

      // Find next nodes based on edges and conditions
      const nextNode = await this.findNextNode(
        currentNode, 
        allNodes, 
        allEdges, 
        context, 
        nodeResult
      );

      if (!nextNode) {
        // End of flow
        return {
          success: true,
          variables: context.variables,
          nodeResults: [{ 
            nodeId: currentNode.id, 
            type: currentNode.type, 
            success: true, 
            output: nodeResult.output 
          }]
        };
      }

      // Continue with next node
      const nextResult = await this.executeNodeRecursive(
        nextNode, 
        allNodes, 
        allEdges, 
        context, 
        new Set(visitedNodes)
      );

      // Combine results
      const combinedResults = [
        { 
          nodeId: currentNode.id, 
          type: currentNode.type, 
          success: true, 
          output: nodeResult.output 
        },
        ...(nextResult.nodeResults || [])
      ];

      return {
        ...nextResult,
        nodeResults: combinedResults
      };

    } catch (error) {
      console.error(`❌ Node execution error for ${currentNode.id}:`, error);
      return {
        success: false,
        error: `Node ${currentNode.id} execution failed: ${error}`,
        nodeResults: [{ 
          nodeId: currentNode.id, 
          type: currentNode.type, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }]
      };
    }
  }

  /**
   * Execute a specific node based on its type
   */
  private async executeNode(node: FlowNode, context: FlowExecutionContext): Promise<{
    success: boolean;
    output?: any;
    error?: string;
  }> {
    const config = typeof node.config === 'string' ? JSON.parse(node.config) : (node.config || {});

    switch (node.type) {
      case 'inbound':
        return this.executeInboundNode(node, context, config);
      
      case 'condition':
        return this.executeConditionNode(node, context, config);
      
      case 'action':
        return this.executeActionNode(node, context, config);
      
      case 'routing':
        return this.executeRoutingNode(node, context, config);
      
      case 'ivr':
        return this.executeIVRNode(node, context, config);
      
      case 'transfer':
        return this.executeTransferNode(node, context, config);
      
      default:
        console.warn(`⚠️ Unknown node type: ${node.type}`);
        return {
          success: true,
          output: { nodeType: node.type, processed: true }
        };
    }
  }

  /**
   * Handle inbound call node
   */
  private async executeInboundNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('📞 Processing inbound call node');
    
    // Store caller information
    const output: any = {
      callReceived: true,
      phoneNumber: context.phoneNumber,
      timestamp: context.currentTime,
      callId: context.callId
    };

    // Check if caller should be captured
    if (config.captureCustomerNumber) {
      output.customerNumber = context.phoneNumber;
    }

    // Set CLI (Caller Line Identification) if configured
    if (config.cli) {
      output.cli = config.cli;
    }

    return { success: true, output };
  }

  /**
   * Handle condition node (time-based, caller-based, etc.)
   */
  private async executeConditionNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🤔 Evaluating condition node');

    const conditions = config.conditions || [];
    let conditionMet = false;
    let matchedCondition = null;

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, context);
      if (result) {
        conditionMet = true;
        matchedCondition = condition;
        break;
      }
    }

    const output = {
      conditionMet,
      matchedCondition,
      evaluatedAt: new Date(),
      currentHour: context.currentTime.getHours()
    };

    return { success: true, output };
  }

  /**
   * Handle action nodes (Flash OOH, recordings, etc.)
   */
  private async executeActionNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('⚡ Executing action node');

    const actionType = config.actionType || 'playMessage';

    switch (actionType) {
      case 'playMessage':
        return this.executePlayMessage(config, context);
      
      case 'flashOOH':
        return this.executeFlashOOH(config, context);
      
      case 'recordMessage':
        return this.executeRecordMessage(config, context);
      
      default:
        return {
          success: true,
          output: { action: actionType, executed: true }
        };
    }
  }

  /**
   * Handle routing nodes
   */
  private async executeRoutingNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🎯 Executing routing node');

    const routingType = config.routingType || 'queue';

    return {
      success: true,
      output: {
        routingType,
        destination: config.destination,
        routed: true
      }
    };
  }

  /**
   * Handle IVR nodes
   */
  private async executeIVRNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('📋 Executing IVR node');

    const options = config.options || [];

    return {
      success: true,
      output: {
        ivrMenu: options,
        promptPlayed: true,
        waitingForInput: true
      }
    };
  }

  /**
   * Handle transfer nodes
   */
  private async executeTransferNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('📞 Executing transfer node');

    const destination = config.destination;

    return {
      success: true,
      output: {
        transferInitiated: true,
        destination,
        transferTime: new Date()
      }
    };
  }

  /**
   * Execute Flash Out of Hours message
   */
  private async executeFlashOOH(
    config: any, 
    context: FlowExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('📢 Playing Flash OOH message');

    // This would integrate with your telephony system
    // For now, we'll simulate the action
    const message = config.message || 'Thank you for calling. We are currently out of office hours.';

    return {
      success: true,
      output: {
        flashOOHPlayed: true,
        message,
        playedAt: new Date()
      }
    };
  }

  /**
   * Execute play message action
   */
  private async executePlayMessage(
    config: any, 
    context: FlowExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    const message = config.message || 'Default message';
    
    return {
      success: true,
      output: {
        messagePlayed: true,
        message,
        playedAt: new Date()
      }
    };
  }

  /**
   * Execute record message action
   */
  private async executeRecordMessage(
    config: any, 
    context: FlowExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    const maxDuration = config.maxDuration || 30;
    
    return {
      success: true,
      output: {
        recordingStarted: true,
        maxDuration,
        startedAt: new Date()
      }
    };
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: any, context: FlowExecutionContext): boolean {
    const { type, operator, value } = condition;

    switch (type) {
      case 'time':
        return this.evaluateTimeCondition(operator, value, context);
      
      case 'caller':
        return this.evaluateCallerCondition(operator, value, context);
      
      case 'variable':
        return this.evaluateVariableCondition(condition, context);
      
      default:
        console.warn(`Unknown condition type: ${type}`);
        return false;
    }
  }

  /**
   * Evaluate time-based conditions
   */
  private evaluateTimeCondition(operator: string, value: any, context: FlowExecutionContext): boolean {
    const currentHour = context.currentTime.getHours();
    const currentMinute = context.currentTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // minutes since midnight

    switch (operator) {
      case 'between':
        if (value.start && value.end) {
          const [startHour, startMin] = value.start.split(':').map(Number);
          const [endHour, endMin] = value.end.split(':').map(Number);
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;
          
          return currentTime >= startTime && currentTime <= endTime;
        }
        return false;

      case 'outside':
        if (value.start && value.end) {
          const [startHour, startMin] = value.start.split(':').map(Number);
          const [endHour, endMin] = value.end.split(':').map(Number);
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;
          
          return currentTime < startTime || currentTime > endTime;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Evaluate caller-based conditions
   */
  private evaluateCallerCondition(operator: string, value: any, context: FlowExecutionContext): boolean {
    switch (operator) {
      case 'equals':
        return context.phoneNumber === value;
      
      case 'startsWith':
        return context.phoneNumber.startsWith(value);
      
      case 'contains':
        return context.phoneNumber.includes(value);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate variable-based conditions
   */
  private evaluateVariableCondition(condition: any, context: FlowExecutionContext): boolean {
    const { variable, operator, value } = condition;
    const variableValue = context.variables[variable];

    switch (operator) {
      case 'equals':
        return variableValue === value;
      
      case 'notEquals':
        return variableValue !== value;
      
      case 'greaterThan':
        return Number(variableValue) > Number(value);
      
      case 'lessThan':
        return Number(variableValue) < Number(value);
      
      default:
        return false;
    }
  }

  /**
   * Find the next node to execute based on edges and conditions
   */
  private async findNextNode(
    currentNode: FlowNode,
    allNodes: FlowNode[],
    allEdges: FlowEdge[],
    context: FlowExecutionContext,
    nodeResult: any
  ): Promise<FlowNode | null> {
    
    // Find all edges leaving this node
    const outgoingEdges = allEdges.filter(edge => edge.sourceNodeId === currentNode.id);

    if (outgoingEdges.length === 0) {
      return null; // End of flow
    }

    // For condition nodes, choose based on condition result
    if (currentNode.type === 'condition' && nodeResult.output?.conditionMet !== undefined) {
      const conditionMet = nodeResult.output.conditionMet;
      
      // Look for edges with specific labels
      const trueEdge = outgoingEdges.find(edge => 
        edge.label?.toLowerCase().includes('yes') || 
        edge.label?.toLowerCase().includes('true') ||
        edge.sourcePort?.toLowerCase().includes('within')
      );
      
      const falseEdge = outgoingEdges.find(edge => 
        edge.label?.toLowerCase().includes('no') || 
        edge.label?.toLowerCase().includes('false') ||
        edge.sourcePort?.toLowerCase().includes('outside')
      );

      const chosenEdge = conditionMet ? trueEdge : falseEdge;
      
      if (chosenEdge) {
        return allNodes.find(node => node.id === chosenEdge.targetNodeId) || null;
      }
    }

    // For other nodes, take the first available edge
    const nextEdge = outgoingEdges[0];
    return allNodes.find(node => node.id === nextEdge.targetNodeId) || null;
  }

  /**
   * Log flow execution events
   */
  private async logFlowExecution(
    flowId: string, 
    callId: string, 
    status: string, 
    details: any
  ): Promise<void> {
    try {
      // This would typically save to a flow_executions table
      console.log(`📝 Flow ${flowId} execution ${status} for call ${callId}`, details);
      
      // For now, we'll emit an event
      this.emit('flowExecutionLogged', {
        flowId,
        callId,
        status,
        details,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log flow execution:', error);
    }
  }

  /**
   * Log node execution events  
   */
  private async logNodeExecution(
    nodeId: string, 
    callId: string, 
    status: string, 
    details: any
  ): Promise<void> {
    try {
      console.log(`📝 Node ${nodeId} execution ${status} for call ${callId}`, details);
      
      this.emit('nodeExecutionLogged', {
        nodeId,
        callId,
        status,
        details,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log node execution:', error);
    }
  }

  /**
   * Get active flows that should be executed for inbound calls
   */
  async getActiveInboundFlows(): Promise<Array<{
    id: string;
    name: string;
    priority?: number;
  }>> {
    const flows = await prisma.flow.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            nodes: {
              where: { isEntry: true }
            }
          }
        }
      }
    });

    return flows
      .filter(flow => 
        flow.versions.length > 0 && 
        flow.versions[0].nodes.some(node => 
          typeof node.type === 'string' && node.type.toLowerCase().includes('inbound')
        )
      )
      .map(flow => ({
        id: flow.id,
        name: flow.name,
        priority: 1 // Default priority
      }))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}

// Export singleton instance
export const flowExecutionEngine = new FlowExecutionEngine();