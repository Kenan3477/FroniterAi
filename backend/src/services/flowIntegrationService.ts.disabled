// Flow Integration Service
import { PrismaClient } from '@prisma/client';
import { eventManager } from './eventManager';
import { EventPriority } from '../types/events';

const prisma = new PrismaClient();

// Flow trigger types
export enum FlowTriggerType {
  OUTBOUND_START = 'outbound_start',
  OUTBOUND_CONNECTED = 'outbound_connected',
  INBOUND_START = 'inbound_start',
  INBOUND_CONNECTED = 'inbound_connected',
  CALL_TRANSFER = 'call_transfer',
  MANUAL = 'manual',
}

// Flow execution status
export enum FlowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Data interfaces
interface FlowExecutionData {
  executionId: string;
  flowId: string;
  campaignId: string;
  callId?: string;
  agentId?: string;
  status: FlowExecutionStatus;
  currentStepId?: string;
  stepData: Record<string, any>;
  variables: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export class FlowIntegrationService {
  /**
   * Assign a flow to a campaign with specific trigger conditions
   */
  async assignFlowToCampaign(params: {
    campaignId: string;
    flowId: string;
    triggerType: FlowTriggerType;
    priority?: number;
    conditions?: any;
  }): Promise<any> {
    const { campaignId, flowId, triggerType, priority = 1, conditions = {} } = params;

    try {
      // Validate that flow exists (if flow platform is available)
      const flowExists = await this.validateFlowExists(flowId);
      if (!flowExists) {
        throw new Error(`Flow ${flowId} does not exist`);
      }

      const campaignFlow = await prisma.campaignFlow.create({
        data: {
          campaignId,
          flowId,
          triggerType,
          priority,
          conditions: JSON.stringify(conditions),
          isActive: true,
        },
      });

      // Emit event for flow assignment
      await eventManager.emitEvent({
        type: 'campaign.updated',
        campaignId,
        metadata: { flowAssigned: flowId, triggerType, priority },
      } as any, `campaign:${campaignId}`, EventPriority.MEDIUM);

      return {
        success: true,
        campaignFlowId: campaignFlow.id,
        message: `Flow ${flowId} assigned to campaign ${campaignId}`,
      };

    } catch (error: any) {
      console.error('Error assigning flow to campaign:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Start flow execution for a specific trigger
   */
  async triggerFlow(params: {
    campaignId: string;
    triggerType: FlowTriggerType;
    callId?: string;
    agentId?: string;
    context?: any;
  }): Promise<any> {
    const { campaignId, triggerType, callId, agentId, context = {} } = params;

    try {
      // Find applicable flows for this trigger
      const applicableFlows = await this.findApplicableFlows(campaignId, triggerType, context);

      if (applicableFlows.length === 0) {
        return {
          success: false,
          message: `No flows found for trigger ${triggerType} in campaign ${campaignId}`,
        };
      }

      // Start execution with highest priority flow
      const primaryFlow = applicableFlows[0];
      const execution = await this.startFlowExecution({
        flowId: primaryFlow.flowId,
        campaignId,
        callId,
        agentId,
        triggerType,
        context,
      });

      return {
        success: true,
        executionId: execution.id,
        flowId: primaryFlow.flowId,
        message: 'Flow execution started successfully',
      };

    } catch (error: any) {
      console.error('Error triggering flow:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get campaign flows
   */
  async getCampaignFlows(campaignId: string): Promise<any[]> {
    try {
      return await prisma.campaignFlow.findMany({
        where: { campaignId, isActive: true },
        orderBy: { priority: 'asc' },
      });
    } catch (error) {
      console.error('Error getting campaign flows:', error);
      return [];
    }
  }

  /**
   * Remove flow from campaign
   */
  async removeFlowFromCampaign(
    campaignId: string, 
    flowId: string, 
    triggerType?: string
  ): Promise<any> {
    try {
      const whereClause: any = { campaignId, flowId };
      if (triggerType) {
        whereClause.triggerType = triggerType;
      }

      await prisma.campaignFlow.deleteMany({
        where: whereClause,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error removing flow from campaign:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start a new flow execution
   */
  private async startFlowExecution(params: {
    flowId: string;
    campaignId: string;
    callId?: string;
    agentId?: string;
    triggerType: FlowTriggerType;
    context: any;
  }): Promise<any> {
    const { flowId, campaignId, callId, agentId, triggerType, context } = params;

    // Get flow definition
    const flowDefinition = await this.getFlowDefinition(flowId);
    if (!flowDefinition) {
      throw new Error(`Could not load definition for flow ${flowId}`);
    }

    // Create execution record
    const execution = await prisma.flowExecution.create({
      data: {
        flowId,
        campaignId,
        callId,
        agentId,
        status: FlowExecutionStatus.RUNNING,
        currentStep: flowDefinition.steps?.[0]?.id || null,
        executionData: JSON.stringify({
          stepData: {},
          variables: context || {},
          metadata: {
            triggerType,
            flowDefinition: {
              id: flowDefinition.id,
              name: flowDefinition.name,
              version: flowDefinition.version,
            },
          },
        }),
        startedAt: new Date(),
      },
    });

    // Emit execution started event
    await eventManager.emitEvent({
      type: 'flow.started',
      flowId,
      executionId: execution.id,
      campaignId,
      callId: callId || undefined,
      agentId: agentId || undefined,
    } as any, `campaign:${campaignId}`, EventPriority.HIGH);

    return execution;
  }

  /**
   * Get active flow executions for an agent
   */
  async getAgentActiveFlows(agentId: string): Promise<FlowExecutionData[]> {
    try {
      const executions = await prisma.flowExecution.findMany({
        where: {
          agentId,
          status: {
            in: [FlowExecutionStatus.RUNNING, FlowExecutionStatus.PAUSED],
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      return executions.map((execution: any) => {
        const executionData = execution.executionData as any;
        return {
          executionId: execution.id,
          flowId: execution.flowId,
          campaignId: execution.campaignId,
          callId: execution.callId || undefined,
          agentId: execution.agentId || undefined,
          status: execution.status as FlowExecutionStatus,
          currentStepId: execution.currentStep || undefined,
          stepData: executionData?.stepData || {},
          variables: executionData?.variables || {},
          startedAt: execution.startedAt,
          completedAt: execution.completedAt || undefined,
          metadata: executionData?.metadata || {},
        };
      });

    } catch (error) {
      console.error('Error getting agent active flows:', error);
      return [];
    }
  }

  // Private helper methods
  private async validateFlowExists(flowId: string): Promise<boolean> {
    try {
      // Call flow platform API to validate flow exists
      if (!process.env.FLOWS_PLATFORM_URL || !process.env.FLOWS_PLATFORM_TOKEN) {
        return true; // Assume valid if external platform not configured
      }

      const response = await fetch(`${process.env.FLOWS_PLATFORM_URL}/api/flows/${flowId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.FLOWS_PLATFORM_TOKEN}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.warn(`Could not validate flow ${flowId}:`, error);
      return true; // Assume it exists if we can't validate
    }
  }

  private async getFlowDefinition(flowId: string): Promise<any> {
    try {
      if (!process.env.FLOWS_PLATFORM_URL || !process.env.FLOWS_PLATFORM_TOKEN) {
        return this.getDefaultFlowDefinition(flowId);
      }

      const response = await fetch(`${process.env.FLOWS_PLATFORM_URL}/api/flows/${flowId}/definition`, {
        headers: {
          'Authorization': `Bearer ${process.env.FLOWS_PLATFORM_TOKEN}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }

      return this.getDefaultFlowDefinition(flowId);

    } catch (error) {
      console.warn(`Could not fetch flow definition for ${flowId}:`, error);
      return this.getDefaultFlowDefinition(flowId);
    }
  }

  private getDefaultFlowDefinition(flowId: string): any {
    return {
      id: flowId,
      name: `Flow ${flowId}`,
      version: '1.0.0',
      steps: [
        {
          id: 'step_1',
          type: 'greeting',
          data: { message: 'Hello! How can I help you today?' },
          nextSteps: [],
        },
      ],
    };
  }

  private async findApplicableFlows(
    campaignId: string,
    triggerType: FlowTriggerType,
    context: any
  ): Promise<any[]> {
    try {
      const campaignFlows = await prisma.campaignFlow.findMany({
        where: {
          campaignId,
          triggerType,
          isActive: true,
        },
        orderBy: { priority: 'asc' },
      });

      const applicableFlows = campaignFlows.filter((flow: any) => {
        try {
          const conditions = flow.conditions && typeof flow.conditions === 'string' ? JSON.parse(flow.conditions) : {};
          return this.evaluateFlowConditions(conditions, context);
        } catch (error) {
          console.warn(`Error parsing conditions for flow ${flow.id}:`, error);
          return true; // Include flow if conditions can't be parsed
        }
      });

      return applicableFlows;

    } catch (error) {
      console.error('Error finding applicable flows:', error);
      return [];
    }
  }

  private evaluateFlowConditions(conditions: any, context: any): boolean {
    try {
      // Basic condition evaluation
      if (conditions.callDirection && context.metadata?.direction !== conditions.callDirection) {
        return false;
      }

      if (conditions.timeRange) {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < conditions.timeRange.start || currentHour > conditions.timeRange.end) {
          return false;
        }
      }

      // Add more condition evaluations as needed
      return true;
    } catch (error) {
      console.warn('Error evaluating flow conditions:', error);
      return true; // Default to true if evaluation fails
    }
  }
}

export default new FlowIntegrationService();