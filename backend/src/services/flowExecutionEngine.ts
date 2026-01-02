import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { getNodeType, NodeCategory } from '../types/flowNodeTypes';

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
    const nodeType = getNodeType(node.type);

    if (!nodeType) {
      console.warn(`⚠️ Unknown node type: ${node.type}`);
      return {
        success: true,
        output: { nodeType: node.type, processed: true }
      };
    }

    console.log(`🔧 Executing ${nodeType.name} node (${node.id})`);

    // Route to appropriate execution method based on category
    switch (nodeType.category) {
      case NodeCategory.ROUTING:
        return this.executeRoutingNode(node, context, config);
      
      case NodeCategory.MEDIA:
        return this.executeMediaNode(node, context, config);
      
      case NodeCategory.CONDITION:
        return this.executeConditionNode(node, context, config);
      
      case NodeCategory.IVR:
        return this.executeIVRNode(node, context, config);
      
      case NodeCategory.QUEUE:
        return this.executeQueueNode(node, context, config);
      
      case NodeCategory.DATA:
        return this.executeDataNode(node, context, config);
      
      case NodeCategory.WORKFLOW:
        return this.executeWorkflowNode(node, context, config);
      
      case NodeCategory.INTEGRATION:
        return this.executeIntegrationNode(node, context, config);
      
      default:
        console.warn(`⚠️ Unhandled node category: ${nodeType.category}`);
        return {
          success: true,
          output: { category: nodeType.category, processed: true }
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
      .filter((flow: any) => 
        flow.versions.length > 0 && 
        flow.versions[0].nodes.some((node: any) => 
          typeof node.type === 'string' && node.type.toLowerCase().includes('inbound')
        )
      )
      .map((flow: any) => ({
        id: flow.id,
        name: flow.name,
        priority: 1 // Default priority
      }))
      .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
  }

  // =============================================================================
  // ENHANCED NODE EXECUTION METHODS
  // =============================================================================

  /**
   * Execute media nodes (audio playback, text-to-speech)
   */
  private async executeMediaNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🎵 Executing media node');

    switch (node.type) {
      case 'audio_playback':
        return this.executeAudioPlayback(config, context);
      
      case 'text_to_speech':
        return this.executeTextToSpeech(config, context);
      
      default:
        return { success: true, output: { mediaType: node.type, executed: true } };
    }
  }

  /**
   * Execute queue management nodes
   */
  private async executeQueueNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('👥 Executing queue node');

    switch (node.type) {
      case 'queue_transfer':
        return this.executeQueueTransfer(config, context);
      
      default:
        return { success: true, output: { queueType: node.type, executed: true } };
    }
  }

  /**
   * Execute data collection nodes
   */
  private async executeDataNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('📊 Executing data node');

    switch (node.type) {
      case 'collect_input':
        return this.executeCollectInput(config, context);
      
      default:
        return { success: true, output: { dataType: node.type, executed: true } };
    }
  }

  /**
   * Execute workflow control nodes
   */
  private async executeWorkflowNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🔄 Executing workflow node');

    switch (node.type) {
      case 'hangup':
        return this.executeHangup(config, context);
      
      default:
        return { success: true, output: { workflowType: node.type, executed: true } };
    }
  }

  /**
   * Execute integration nodes (future use)
   */
  private async executeIntegrationNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🔌 Executing integration node');
    
    return { success: true, output: { integrationType: node.type, executed: true } };
  }

  // =============================================================================
  // ENHANCED NODE IMPLEMENTATIONS
  // =============================================================================

  /**
   * Execute audio playback from uploaded files
   */
  private async executeAudioPlayback(config: any, context: FlowExecutionContext) {
    console.log('🎵 Playing audio file:', config.audioFileId);

    try {
      // TODO: Integrate with actual audio playback system
      // For now, simulate audio playback
      const duration = 5000; // Simulate 5 second audio
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing

      return {
        success: true,
        output: {
          audioFileId: config.audioFileId,
          duration: duration,
          volume: config.volume || 100,
          completed: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Audio playback failed: ${error}`
      };
    }
  }

  /**
   * Execute text-to-speech
   */
  private async executeTextToSpeech(config: any, context: FlowExecutionContext) {
    console.log('🗣️ Converting text to speech:', config.text?.substring(0, 50) + '...');

    try {
      // TODO: Integrate with actual TTS system (e.g., Twilio, AWS Polly)
      const estimatedDuration = (config.text?.length || 0) * 100; // 100ms per character estimate

      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing

      return {
        success: true,
        output: {
          text: config.text,
          voice: config.voice || 'alice',
          speed: config.speed || 1.0,
          language: config.language || 'en-GB',
          estimatedDuration: estimatedDuration,
          completed: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `TTS failed: ${error}`
      };
    }
  }

  /**
   * Execute queue transfer
   */
  private async executeQueueTransfer(config: any, context: FlowExecutionContext) {
    console.log('👥 Transferring to queue:', config.queueId);

    try {
      // Check if queue exists and is available
      const queue = await prisma.inboundQueue.findUnique({
        where: { id: config.queueId }
      });

      if (!queue) {
        return {
          success: false,
          error: 'Queue not found'
        };
      }

      if (!queue.isActive) {
        return {
          success: false,
          error: 'Queue is not active'
        };
      }

      // For now, simulate available agents (TODO: integrate with actual agent management)
      const simulatedAvailableAgents = Math.floor(Math.random() * 3) + 1;

      if (simulatedAvailableAgents === 0) {
        return {
          success: false,
          error: 'No agents available',
          output: { waitlistPosition: await this.getQueueWaitlistPosition(config.queueId) }
        };
      }

      // Simulate queue entry
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        output: {
          queueId: config.queueId,
          queueName: queue.name,
          priority: config.priority || 3,
          estimatedWaitTime: this.calculateEstimatedWaitTime(queue),
          availableAgents: simulatedAvailableAgents,
          transferred: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Queue transfer failed: ${error}`
      };
    }
  }

  /**
   * Execute input collection (digits, speech)
   */
  private async executeCollectInput(config: any, context: FlowExecutionContext) {
    console.log('⌨️ Collecting input:', config.inputType);

    try {
      // TODO: Integrate with actual input collection system
      // For now, simulate input collection
      
      // Simulate user input based on type
      let simulatedInput = '';
      if (config.inputType === 'digits') {
        simulatedInput = '12345'.substring(0, config.maxLength || 5);
      } else if (config.inputType === 'speech') {
        simulatedInput = 'customer service';
      }

      // Validate input length
      if (simulatedInput.length < (config.minLength || 1)) {
        return {
          success: false,
          error: 'Input too short',
          output: { collected: simulatedInput, valid: false }
        };
      }

      // Store in context variables
      if (config.variableName) {
        context.variables[config.variableName] = simulatedInput;
      }

      return {
        success: true,
        output: {
          inputType: config.inputType,
          collected: simulatedInput,
          variableName: config.variableName,
          valid: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Input collection failed: ${error}`
      };
    }
  }

  /**
   * Execute call hangup
   */
  private async executeHangup(config: any, context: FlowExecutionContext) {
    console.log('📞 Ending call with disposition:', config.callDisposition);

    try {
      // Play farewell message if configured
      if (config.farewellMessage) {
        console.log('💬 Playing farewell message:', config.farewellMessage);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate message playback
      }

      // Set call disposition
      const disposition = config.callDisposition || 'completed';
      
      // TODO: Integrate with actual call termination system
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        output: {
          callDisposition: disposition,
          farewellMessage: config.farewellMessage,
          callEnded: true,
          endTime: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Call hangup failed: ${error}`
      };
    }
  }

  // =============================================================================
  // ENHANCED ROUTING METHODS
  // =============================================================================

  /**
   * Enhanced routing node execution with external transfer support
   */
  private async executeRoutingNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🎯 Executing enhanced routing node');

    switch (node.type) {
      case 'external_transfer':
        return this.executeExternalTransfer(config, context);
      
      default:
        // Fall back to original routing logic
        return { success: true, output: { routingType: node.type, executed: true } };
    }
  }

  /**
   * Execute external transfer to phone number
   */
  private async executeExternalTransfer(config: any, context: FlowExecutionContext) {
    console.log('📞 External transfer to:', config.phoneNumber);

    try {
      // Validate phone number format
      if (!config.phoneNumber || !/^\+[1-9]\d{1,14}$/.test(config.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // TODO: Integrate with actual transfer system (Twilio, etc.)
      // For now, simulate transfer attempt
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate ring time

      // Simulate transfer outcome (randomized for demo)
      const outcomes = ['connected', 'busy', 'no_answer', 'failed'];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

      return {
        success: outcome === 'connected',
        output: {
          phoneNumber: config.phoneNumber,
          transferType: config.transferType || 'blind',
          outcome: outcome,
          ringDuration: 2000,
          callerIdOverride: config.callerIdOverride
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `External transfer failed: ${error}`
      };
    }
  }

  // =============================================================================
  // ENHANCED CONDITION METHODS  
  // =============================================================================

  /**
   * Enhanced condition node with business hours and caller data support
   */
  private async executeConditionNode(
    node: FlowNode, 
    context: FlowExecutionContext, 
    config: any
  ): Promise<{ success: boolean; output?: any; error?: string; }> {
    console.log('🔍 Executing enhanced condition node');

    switch (node.type) {
      case 'business_hours':
        return this.executeBusinessHoursCheck(config, context);
      
      case 'caller_condition':
        return this.executeCallerCondition(config, context);
      
      default:
        // Fall back to original condition logic for unknown condition types
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

        return {
          success: true,
          output: {
            conditionMet,
            matchedCondition,
            evaluatedAt: new Date()
          }
        };
    }
  }

  /**
   * Check business hours
   */
  private async executeBusinessHoursCheck(config: any, context: FlowExecutionContext) {
    console.log('🕒 Checking business hours');

    try {
      const now = new Date();
      const timezone = config.timezone || 'Europe/London';
      
      // Get current time in business timezone
      const businessTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const currentDay = businessTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone });
      const currentTime = businessTime.toTimeString().slice(0, 5); // HH:MM format

      // Check if current day is a business day
      const businessDays = config.businessDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      if (!businessDays.includes(currentDay)) {
        return {
          success: true,
          output: {
            isOpen: false,
            reason: 'closed_day',
            currentDay: currentDay,
            currentTime: currentTime,
            timezone: timezone
          }
        };
      }

      // Check if current time is within business hours
      const openTime = config.openTime || '09:00';
      const closeTime = config.closeTime || '17:00';
      
      const isOpen = currentTime >= openTime && currentTime <= closeTime;

      // Check for holidays
      const holidays = config.holidays || [];
      const currentDate = businessTime.toISOString().slice(0, 10); // YYYY-MM-DD
      const isHoliday = holidays.includes(currentDate);

      return {
        success: true,
        output: {
          isOpen: isOpen && !isHoliday,
          reason: isHoliday ? 'holiday' : isOpen ? 'open' : 'closed_hours',
          currentDay: currentDay,
          currentTime: currentTime,
          openTime: openTime,
          closeTime: closeTime,
          timezone: timezone,
          isHoliday: isHoliday
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Business hours check failed: ${error}`
      };
    }
  }

  /**
   * Check caller-specific conditions
   */
  private async executeCallerCondition(config: any, context: FlowExecutionContext) {
    console.log('👤 Checking caller condition:', config.conditionType);

    try {
      const conditionType = config.conditionType;
      const operator = config.operator;
      const value = config.value;
      const valueList = config.valueList || [];

      let testValue = '';
      
      // Get the value to test based on condition type
      switch (conditionType) {
        case 'phone_number':
          testValue = context.phoneNumber;
          break;
        case 'country_code':
          testValue = context.phoneNumber.substring(0, 3); // First 3 chars as country code
          break;
        case 'vip_status':
          // TODO: Look up VIP status from customer database
          testValue = 'STANDARD'; // Default for now
          break;
        case 'call_history':
          // TODO: Look up call history from database
          testValue = '0'; // Default for now
          break;
        default:
          testValue = '';
      }

      // Evaluate condition based on operator
      let conditionMet = false;
      switch (operator) {
        case 'equals':
          conditionMet = testValue === value;
          break;
        case 'contains':
          conditionMet = testValue.includes(value);
          break;
        case 'starts_with':
          conditionMet = testValue.startsWith(value);
          break;
        case 'in_list':
          conditionMet = valueList.includes(testValue);
          break;
        default:
          conditionMet = false;
      }

      return {
        success: true,
        output: {
          conditionType: conditionType,
          operator: operator,
          testValue: testValue,
          expectedValue: value,
          conditionMet: conditionMet
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Caller condition check failed: ${error}`
      };
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async getQueueWaitlistPosition(queueId: string): Promise<number> {
    // TODO: Implement actual queue position calculation
    return Math.floor(Math.random() * 5) + 1;
  }

  private calculateEstimatedWaitTime(queue: any): number {
    // TODO: Calculate based on historical data and current queue load
    return Math.floor(Math.random() * 300) + 60; // Random 1-5 minutes
  }
}

// Export singleton instance
export const flowExecutionEngine = new FlowExecutionEngine();