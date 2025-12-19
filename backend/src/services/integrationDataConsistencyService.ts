// Integration Data Consistency Service
// Comprehensive data validation, monitoring, and healing across all system integrations

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter();

// Data Consistency Levels
export enum ConsistencyLevel {
  STRICT = 'STRICT',           // Zero tolerance for inconsistencies
  MODERATE = 'MODERATE',       // Minor inconsistencies allowed
  RELAXED = 'RELAXED'          // Flexible consistency requirements
}

// Consistency Check Status
export enum ConsistencyStatus {
  CONSISTENT = 'CONSISTENT',
  INCONSISTENT = 'INCONSISTENT',
  HEALING = 'HEALING',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN'
}

// Data Entity Types
export enum EntityType {
  CONTACT = 'CONTACT',
  CAMPAIGN = 'CAMPAIGN',
  CALL = 'CALL',
  DISPOSITION = 'DISPOSITION',
  OUTCOME = 'OUTCOME',
  LIFECYCLE = 'LIFECYCLE',
  AGENT = 'AGENT',
  INTEGRATION = 'INTEGRATION',
  FLOW_EXECUTION = 'FLOW_EXECUTION'
}

// Inconsistency Severity
export enum InconsistencySeverity {
  CRITICAL = 'CRITICAL',      // System-breaking inconsistencies
  HIGH = 'HIGH',              // Significant data integrity issues
  MEDIUM = 'MEDIUM',          // Moderate inconsistencies affecting accuracy
  LOW = 'LOW',                // Minor issues with limited impact
  INFO = 'INFO'               // Informational discrepancies
}

// Healing Strategy
export enum HealingStrategy {
  AUTO_RESOLVE = 'AUTO_RESOLVE',           // Automatically fix using rules
  MERGE_LATEST = 'MERGE_LATEST',           // Use most recent data
  MERGE_TRUSTED = 'MERGE_TRUSTED',         // Use data from trusted source
  MANUAL_REVIEW = 'MANUAL_REVIEW',         // Require manual intervention
  BACKUP_RESTORE = 'BACKUP_RESTORE',       // Restore from backup
  DELETE_DUPLICATE = 'DELETE_DUPLICATE',   // Remove duplicate entries
  RECONCILE = 'RECONCILE'                  // Intelligent reconciliation
}

// Consistency Rule
export interface ConsistencyRule {
  id: string;
  name: string;
  description: string;
  entityType: EntityType;
  severity: InconsistencySeverity;
  isActive: boolean;
  
  // Rule Definition
  checkFunction: string;           // Function name to execute
  validationSchema?: any;          // JSON schema for validation
  crossReferenceEntities?: EntityType[]; // Related entities to check
  
  // Healing Configuration
  healingStrategy: HealingStrategy;
  autoHeal: boolean;
  healingFunction?: string;        // Custom healing function
  
  // Performance
  executionFrequency: number;      // Minutes between checks
  lastExecuted?: Date;
  avgExecutionTime?: number;       // Milliseconds
  
  // Thresholds
  warningThreshold: number;        // % inconsistency for warning
  criticalThreshold: number;       // % inconsistency for critical alert
  
  metadata?: Record<string, any>;
}

// Inconsistency Record
export interface InconsistencyRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  entityType: EntityType;
  entityId: string;
  severity: InconsistencySeverity;
  status: ConsistencyStatus;
  
  // Issue Details
  description: string;
  inconsistencyType: string;
  affectedFields: string[];
  expectedValue?: any;
  actualValue?: any;
  conflictingData?: {
    source: string;
    value: any;
    timestamp: Date;
  }[];
  
  // Resolution
  healingStrategy: HealingStrategy;
  healingAttempts: number;
  lastHealingAttempt?: Date;
  healingError?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  
  // Impact Assessment
  impactScore: number;             // 0-100 impact on system
  affectedEntities: string[];      // IDs of other affected entities
  businessImpact: string;          // Description of business impact
  
  // Timestamps
  detectedAt: Date;
  firstDetectedAt: Date;
  acknowledgedAt?: Date;
  escalatedAt?: Date;
  
  metadata?: Record<string, any>;
}

// Consistency Report
export interface ConsistencyReport {
  id: string;
  campaignId?: string;
  entityType?: EntityType;
  reportType: 'FULL_SYSTEM' | 'CAMPAIGN' | 'ENTITY_TYPE' | 'CUSTOM';
  
  // Overview
  totalEntitiesChecked: number;
  totalRulesExecuted: number;
  totalInconsistencies: number;
  consistencyScore: number;        // 0-100% overall consistency
  
  // Breakdown by Severity
  severityBreakdown: {
    [K in InconsistencySeverity]: {
      count: number;
      percentage: number;
      resolved: number;
      pending: number;
    };
  };
  
  // Breakdown by Entity Type
  entityBreakdown: {
    entityType: EntityType;
    totalChecked: number;
    inconsistencies: number;
    consistencyScore: number;
    topIssues: string[];
  }[];
  
  // Rule Performance
  rulePerformance: {
    ruleId: string;
    ruleName: string;
    executionTime: number;
    inconsistenciesFound: number;
    successRate: number;            // % of successful healings
  }[];
  
  // Trending Data
  trendingIssues: {
    inconsistencyType: string;
    count: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    changePercentage: number;
  }[];
  
  // Recommendations
  recommendations: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    description: string;
    estimatedImpact: string;
    suggestedActions: string[];
  }[];
  
  // Execution Info
  generatedAt: Date;
  executionTimeMs: number;
  dataFreshnessScore: number;      // How recent the data is (0-100)
  
  metadata?: Record<string, any>;
}

// Healing Result
export interface HealingResult {
  inconsistencyId: string;
  strategy: HealingStrategy;
  success: boolean;
  healingTime: number;             // Milliseconds
  
  // Changes Made
  changesApplied: {
    field: string;
    oldValue: any;
    newValue: any;
    source: string;
  }[];
  
  // Validation
  preHealingState: any;
  postHealingState: any;
  validationPassed: boolean;
  
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

class IntegrationDataConsistencyService {
  private consistencyRules: ConsistencyRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  // Initialize default consistency rules
  private initializeDefaultRules(): void {
    const defaultRules: ConsistencyRule[] = [
      // Contact Data Consistency
      {
        id: 'contact_phone_format',
        name: 'Contact Phone Format Validation',
        description: 'Ensures all contact phone numbers follow standard format',
        entityType: EntityType.CONTACT,
        severity: InconsistencySeverity.HIGH,
        isActive: true,
        checkFunction: 'validateContactPhoneFormat',
        healingStrategy: HealingStrategy.AUTO_RESOLVE,
        autoHeal: true,
        healingFunction: 'standardizePhoneFormat',
        executionFrequency: 60,
        warningThreshold: 5,
        criticalThreshold: 15
      },
      
      // Call-Contact Relationship Consistency
      {
        id: 'call_contact_reference',
        name: 'Call-Contact Reference Integrity',
        description: 'Validates that all calls have valid contact references',
        entityType: EntityType.CALL,
        severity: InconsistencySeverity.CRITICAL,
        isActive: true,
        checkFunction: 'validateCallContactReferences',
        crossReferenceEntities: [EntityType.CONTACT],
        healingStrategy: HealingStrategy.MANUAL_REVIEW,
        autoHeal: false,
        executionFrequency: 30,
        warningThreshold: 1,
        criticalThreshold: 5
      },
      
      // Disposition-Outcome Mapping Consistency
      {
        id: 'disposition_outcome_mapping',
        name: 'Disposition-Outcome Mapping Validation',
        description: 'Ensures dispositions correctly map to call outcomes',
        entityType: EntityType.DISPOSITION,
        severity: InconsistencySeverity.HIGH,
        isActive: true,
        checkFunction: 'validateDispositionOutcomeMapping',
        crossReferenceEntities: [EntityType.OUTCOME],
        healingStrategy: HealingStrategy.AUTO_RESOLVE,
        autoHeal: true,
        healingFunction: 'remapDispositionOutcomes',
        executionFrequency: 120,
        warningThreshold: 3,
        criticalThreshold: 10
      },
      
      // Campaign Data Integrity
      {
        id: 'campaign_agent_assignment',
        name: 'Campaign Agent Assignment Consistency',
        description: 'Validates campaign-agent assignments and active status',
        entityType: EntityType.CAMPAIGN,
        severity: InconsistencySeverity.MEDIUM,
        isActive: true,
        checkFunction: 'validateCampaignAgentAssignments',
        crossReferenceEntities: [EntityType.AGENT],
        healingStrategy: HealingStrategy.RECONCILE,
        autoHeal: true,
        healingFunction: 'reconcileCampaignAssignments',
        executionFrequency: 180,
        warningThreshold: 10,
        criticalThreshold: 25
      },
      
      // Lifecycle Stage Progression Consistency
      {
        id: 'lifecycle_stage_progression',
        name: 'Lead Lifecycle Stage Progression Validation',
        description: 'Ensures lead lifecycle stages follow valid progression rules',
        entityType: EntityType.LIFECYCLE,
        severity: InconsistencySeverity.HIGH,
        isActive: true,
        checkFunction: 'validateLifecycleStageProgression',
        healingStrategy: HealingStrategy.MANUAL_REVIEW,
        autoHeal: false,
        executionFrequency: 240,
        warningThreshold: 2,
        criticalThreshold: 8
      },
      
      // Flow Execution Data Consistency
      {
        id: 'flow_execution_completeness',
        name: 'Flow Execution Data Completeness',
        description: 'Validates flow execution records have complete data',
        entityType: EntityType.FLOW_EXECUTION,
        severity: InconsistencySeverity.MEDIUM,
        isActive: true,
        checkFunction: 'validateFlowExecutionCompleteness',
        healingStrategy: HealingStrategy.AUTO_RESOLVE,
        autoHeal: true,
        healingFunction: 'completeFlowExecutionData',
        executionFrequency: 90,
        warningThreshold: 5,
        criticalThreshold: 15
      },
      
      // Integration Sync Status Consistency
      {
        id: 'integration_sync_status',
        name: 'Integration Synchronization Status',
        description: 'Monitors integration sync status and data freshness',
        entityType: EntityType.INTEGRATION,
        severity: InconsistencySeverity.HIGH,
        isActive: true,
        checkFunction: 'validateIntegrationSyncStatus',
        healingStrategy: HealingStrategy.AUTO_RESOLVE,
        autoHeal: true,
        healingFunction: 'resyncIntegrationData',
        executionFrequency: 15,
        warningThreshold: 5,
        criticalThreshold: 20
      }
    ];

    this.consistencyRules = defaultRules;
  }

  // Execute consistency checks
  async executeConsistencyCheck(options: {
    ruleIds?: string[];
    entityType?: EntityType;
    entityIds?: string[];
    campaignId?: string;
    severity?: InconsistencySeverity[];
    force?: boolean;
  } = {}): Promise<InconsistencyRecord[]> {
    const rulesToExecute = this.filterRules(options);
    const inconsistencies: InconsistencyRecord[] = [];

    for (const rule of rulesToExecute) {
      try {
        // Check if rule should be executed (based on frequency)
        if (!options.force && !this.shouldExecuteRule(rule)) {
          continue;
        }

        const ruleInconsistencies = await this.executeRule(rule, options);
        inconsistencies.push(...ruleInconsistencies);

        // Update rule execution metadata
        rule.lastExecuted = new Date();
      } catch (error) {
        console.error(`Error executing rule ${rule.name}:`, error);
        
        // Create inconsistency record for rule execution failure
        inconsistencies.push({
          id: `rule_error_${rule.id}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          entityType: rule.entityType,
          entityId: 'SYSTEM',
          severity: InconsistencySeverity.HIGH,
          status: ConsistencyStatus.FAILED,
          description: `Failed to execute consistency rule: ${rule.name}`,
          inconsistencyType: 'RULE_EXECUTION_ERROR',
          affectedFields: [],
          healingStrategy: HealingStrategy.MANUAL_REVIEW,
          healingAttempts: 0,
          impactScore: 75,
          affectedEntities: [],
          businessImpact: 'Consistency monitoring compromised',
          detectedAt: new Date(),
          firstDetectedAt: new Date(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            ruleConfig: rule
          }
        });
      }
    }

    // Emit consistency check event
    this.emitConsistencyEvent('consistency.check_completed', {
      rulesExecuted: rulesToExecute.length,
      inconsistenciesFound: inconsistencies.length,
      options
    });

    return inconsistencies;
  }

  // Execute individual rule
  private async executeRule(rule: ConsistencyRule, options: any): Promise<InconsistencyRecord[]> {
    const startTime = Date.now();
    
    try {
      // Get entities to check based on rule and options
      const entitiesToCheck = await this.getEntitiesToCheck(rule, options);
      const inconsistencies: InconsistencyRecord[] = [];

      for (const entity of entitiesToCheck) {
        const entityInconsistencies = await this.checkEntityConsistency(rule, entity);
        inconsistencies.push(...entityInconsistencies);
      }

      // Update rule performance metrics
      const executionTime = Date.now() - startTime;
      rule.avgExecutionTime = rule.avgExecutionTime 
        ? (rule.avgExecutionTime + executionTime) / 2 
        : executionTime;

      return inconsistencies;
    } catch (error) {
      console.error(`Error in rule execution for ${rule.name}:`, error);
      throw error;
    }
  }

  // Check individual entity consistency
  private async checkEntityConsistency(rule: ConsistencyRule, entity: any): Promise<InconsistencyRecord[]> {
    switch (rule.checkFunction) {
      case 'validateContactPhoneFormat':
        return await this.validateContactPhoneFormat(rule, entity);
      case 'validateCallContactReferences':
        return await this.validateCallContactReferences(rule, entity);
      case 'validateDispositionOutcomeMapping':
        return await this.validateDispositionOutcomeMapping(rule, entity);
      case 'validateCampaignAgentAssignments':
        return await this.validateCampaignAgentAssignments(rule, entity);
      case 'validateLifecycleStageProgression':
        return await this.validateLifecycleStageProgression(rule, entity);
      case 'validateFlowExecutionCompleteness':
        return await this.validateFlowExecutionCompleteness(rule, entity);
      case 'validateIntegrationSyncStatus':
        return await this.validateIntegrationSyncStatus(rule, entity);
      default:
        console.warn(`Unknown check function: ${rule.checkFunction}`);
        return [];
    }
  }

  // Heal inconsistencies
  async healInconsistencies(inconsistencyIds: string[]): Promise<HealingResult[]> {
    const results: HealingResult[] = [];

    for (const inconsistencyId of inconsistencyIds) {
      try {
        const inconsistency = await this.getInconsistencyById(inconsistencyId);
        if (!inconsistency) {
          results.push({
            inconsistencyId,
            strategy: HealingStrategy.MANUAL_REVIEW,
            success: false,
            healingTime: 0,
            changesApplied: [],
            preHealingState: null,
            postHealingState: null,
            validationPassed: false,
            error: 'Inconsistency not found'
          });
          continue;
        }

        const healingResult = await this.healInconsistency(inconsistency);
        results.push(healingResult);

        // Update inconsistency status
        if (healingResult.success) {
          inconsistency.status = ConsistencyStatus.CONSISTENT;
          inconsistency.resolvedAt = new Date();
          inconsistency.resolution = 'Automatically healed';
        } else {
          inconsistency.healingAttempts++;
          inconsistency.lastHealingAttempt = new Date();
          inconsistency.healingError = healingResult.error;
        }

      } catch (error) {
        results.push({
          inconsistencyId,
          strategy: HealingStrategy.MANUAL_REVIEW,
          success: false,
          healingTime: 0,
          changesApplied: [],
          preHealingState: null,
          postHealingState: null,
          validationPassed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Generate consistency report
  async generateConsistencyReport(options: {
    campaignId?: string;
    entityType?: EntityType;
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    includeResolved?: boolean;
  } = {}): Promise<ConsistencyReport> {
    const startTime = Date.now();
    
    // Get all inconsistencies based on filters
    const inconsistencies = await this.getFilteredInconsistencies(options);
    const totalEntitiesChecked = await this.getTotalEntitiesChecked(options);
    
    // Calculate consistency score
    const consistencyScore = totalEntitiesChecked > 0 
      ? Math.max(0, 100 - ((inconsistencies.length / totalEntitiesChecked) * 100))
      : 100;

    // Severity breakdown
    const severityBreakdown = this.calculateSeverityBreakdown(inconsistencies);
    
    // Entity type breakdown
    const entityBreakdown = await this.calculateEntityBreakdown(inconsistencies, options);
    
    // Rule performance
    const rulePerformance = this.calculateRulePerformance();
    
    // Trending issues
    const trendingIssues = await this.calculateTrendingIssues(options);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(inconsistencies, severityBreakdown);

    const report: ConsistencyReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaignId: options.campaignId,
      entityType: options.entityType,
      reportType: options.campaignId ? 'CAMPAIGN' : 
                 options.entityType ? 'ENTITY_TYPE' : 'FULL_SYSTEM',
      totalEntitiesChecked,
      totalRulesExecuted: this.consistencyRules.filter(r => r.isActive).length,
      totalInconsistencies: inconsistencies.length,
      consistencyScore,
      severityBreakdown,
      entityBreakdown,
      rulePerformance,
      trendingIssues,
      recommendations,
      generatedAt: new Date(),
      executionTimeMs: Date.now() - startTime,
      dataFreshnessScore: this.calculateDataFreshnessScore()
    };

    // Emit report generation event
    this.emitConsistencyEvent('consistency.report_generated', {
      reportId: report.id,
      consistencyScore: report.consistencyScore,
      totalInconsistencies: report.totalInconsistencies
    });

    return report;
  }

  // Specific validation functions
  private async validateContactPhoneFormat(rule: ConsistencyRule, contact: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    const phoneFields = ['phone', 'mobile'];
    for (const field of phoneFields) {
      const phoneValue = contact[field];
      if (phoneValue && !this.isValidPhoneFormat(phoneValue)) {
        inconsistencies.push({
          id: `phone_format_${contact.id}_${field}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          entityType: EntityType.CONTACT,
          entityId: contact.id,
          severity: rule.severity,
          status: ConsistencyStatus.INCONSISTENT,
          description: `Invalid phone format in ${field}: ${phoneValue}`,
          inconsistencyType: 'INVALID_PHONE_FORMAT',
          affectedFields: [field],
          expectedValue: this.standardizePhoneNumber(phoneValue),
          actualValue: phoneValue,
          healingStrategy: rule.healingStrategy,
          healingAttempts: 0,
          impactScore: 30,
          affectedEntities: [contact.id],
          businessImpact: 'May prevent successful calls',
          detectedAt: new Date(),
          firstDetectedAt: new Date()
        });
      }
    }

    return inconsistencies;
  }

  private async validateCallContactReferences(rule: ConsistencyRule, call: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    if (call.contactId) {
      // Check if contact exists
      const contactExists = await this.doesContactExist(call.contactId);
      if (!contactExists) {
        inconsistencies.push({
          id: `missing_contact_${call.id}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          entityType: EntityType.CALL,
          entityId: call.id,
          severity: rule.severity,
          status: ConsistencyStatus.INCONSISTENT,
          description: `Call references non-existent contact: ${call.contactId}`,
          inconsistencyType: 'MISSING_CONTACT_REFERENCE',
          affectedFields: ['contactId'],
          expectedValue: 'Valid contact ID',
          actualValue: call.contactId,
          healingStrategy: rule.healingStrategy,
          healingAttempts: 0,
          impactScore: 85,
          affectedEntities: [call.id],
          businessImpact: 'Call data integrity compromised',
          detectedAt: new Date(),
          firstDetectedAt: new Date()
        });
      }
    }

    return inconsistencies;
  }

  private async validateDispositionOutcomeMapping(rule: ConsistencyRule, disposition: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    // Check if disposition has corresponding outcome
    if (disposition.callId) {
      const outcome = await this.getCallOutcome(disposition.callId);
      if (!outcome) {
        inconsistencies.push({
          id: `missing_outcome_${disposition.id}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          entityType: EntityType.DISPOSITION,
          entityId: disposition.id,
          severity: rule.severity,
          status: ConsistencyStatus.INCONSISTENT,
          description: `Disposition without corresponding call outcome`,
          inconsistencyType: 'MISSING_OUTCOME_MAPPING',
          affectedFields: ['callId'],
          healingStrategy: rule.healingStrategy,
          healingAttempts: 0,
          impactScore: 60,
          affectedEntities: [disposition.id],
          businessImpact: 'Incomplete conversion tracking',
          detectedAt: new Date(),
          firstDetectedAt: new Date()
        });
      }
    }

    return inconsistencies;
  }

  private async validateCampaignAgentAssignments(rule: ConsistencyRule, campaign: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    // Check for inactive agents assigned to active campaigns
    if (campaign.isActive) {
      const assignments = await this.getCampaignAgentAssignments(campaign.id);
      for (const assignment of assignments) {
        const agent = await this.getAgent(assignment.agentId);
        if (!agent || agent.status !== 'ACTIVE') {
          inconsistencies.push({
            id: `inactive_agent_${campaign.id}_${assignment.agentId}_${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            entityType: EntityType.CAMPAIGN,
            entityId: campaign.id,
            severity: rule.severity,
            status: ConsistencyStatus.INCONSISTENT,
            description: `Active campaign assigned to inactive agent: ${assignment.agentId}`,
            inconsistencyType: 'INACTIVE_AGENT_ASSIGNMENT',
            affectedFields: ['agentAssignments'],
            healingStrategy: rule.healingStrategy,
            healingAttempts: 0,
            impactScore: 70,
            affectedEntities: [campaign.id, assignment.agentId],
            businessImpact: 'Reduced campaign effectiveness',
            detectedAt: new Date(),
            firstDetectedAt: new Date()
          });
        }
      }
    }

    return inconsistencies;
  }

  private async validateLifecycleStageProgression(rule: ConsistencyRule, lifecycle: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    // Check for invalid stage transitions
    if (lifecycle.stageHistory && lifecycle.stageHistory.length > 1) {
      for (let i = 1; i < lifecycle.stageHistory.length; i++) {
        const prevStage = lifecycle.stageHistory[i - 1].toStage;
        const currentStage = lifecycle.stageHistory[i].toStage;
        
        if (!this.isValidStageTransition(prevStage, currentStage)) {
          inconsistencies.push({
            id: `invalid_transition_${lifecycle.id}_${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            entityType: EntityType.LIFECYCLE,
            entityId: lifecycle.id,
            severity: rule.severity,
            status: ConsistencyStatus.INCONSISTENT,
            description: `Invalid stage transition from ${prevStage} to ${currentStage}`,
            inconsistencyType: 'INVALID_STAGE_TRANSITION',
            affectedFields: ['stageHistory'],
            healingStrategy: rule.healingStrategy,
            healingAttempts: 0,
            impactScore: 50,
            affectedEntities: [lifecycle.id],
            businessImpact: 'Lead progression data integrity compromised',
            detectedAt: new Date(),
            firstDetectedAt: new Date()
          });
        }
      }
    }

    return inconsistencies;
  }

  private async validateFlowExecutionCompleteness(rule: ConsistencyRule, flowExecution: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    // Check for incomplete flow execution data
    const requiredFields = ['callId', 'flowId', 'status', 'startTime'];
    for (const field of requiredFields) {
      if (!flowExecution[field]) {
        inconsistencies.push({
          id: `incomplete_flow_${flowExecution.id}_${field}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          entityType: EntityType.FLOW_EXECUTION,
          entityId: flowExecution.id,
          severity: rule.severity,
          status: ConsistencyStatus.INCONSISTENT,
          description: `Missing required field: ${field}`,
          inconsistencyType: 'INCOMPLETE_DATA',
          affectedFields: [field],
          healingStrategy: rule.healingStrategy,
          healingAttempts: 0,
          impactScore: 40,
          affectedEntities: [flowExecution.id],
          businessImpact: 'Flow tracking compromised',
          detectedAt: new Date(),
          firstDetectedAt: new Date()
        });
      }
    }

    return inconsistencies;
  }

  private async validateIntegrationSyncStatus(rule: ConsistencyRule, integration: any): Promise<InconsistencyRecord[]> {
    const inconsistencies: InconsistencyRecord[] = [];
    
    // Check sync status and data freshness
    if (integration.lastSyncAt) {
      const hoursSinceSync = (Date.now() - new Date(integration.lastSyncAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 24) { // More than 24 hours since last sync
        inconsistencies.push({
          id: `stale_sync_${integration.id}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          entityType: EntityType.INTEGRATION,
          entityId: integration.id,
          severity: rule.severity,
          status: ConsistencyStatus.INCONSISTENT,
          description: `Integration data is stale (${hoursSinceSync.toFixed(1)} hours since last sync)`,
          inconsistencyType: 'STALE_INTEGRATION_DATA',
          affectedFields: ['lastSyncAt'],
          healingStrategy: rule.healingStrategy,
          healingAttempts: 0,
          impactScore: 60,
          affectedEntities: [integration.id],
          businessImpact: 'Data accuracy compromised',
          detectedAt: new Date(),
          firstDetectedAt: new Date()
        });
      }
    }

    return inconsistencies;
  }

  // Healing functions
  private async healInconsistency(inconsistency: InconsistencyRecord): Promise<HealingResult> {
    const startTime = Date.now();
    const preHealingState = await this.getEntityState(inconsistency.entityType, inconsistency.entityId);

    try {
      const rule = this.consistencyRules.find(r => r.id === inconsistency.ruleId);
      if (!rule || !rule.healingFunction) {
        throw new Error(`No healing function defined for rule: ${inconsistency.ruleId}`);
      }

      const changesApplied = await this.executeHealingFunction(rule.healingFunction, inconsistency);
      const postHealingState = await this.getEntityState(inconsistency.entityType, inconsistency.entityId);
      
      // Validate healing
      const validationPassed = await this.validateHealing(inconsistency, preHealingState, postHealingState);

      return {
        inconsistencyId: inconsistency.id,
        strategy: inconsistency.healingStrategy,
        success: validationPassed,
        healingTime: Date.now() - startTime,
        changesApplied,
        preHealingState,
        postHealingState,
        validationPassed
      };
    } catch (error) {
      return {
        inconsistencyId: inconsistency.id,
        strategy: inconsistency.healingStrategy,
        success: false,
        healingTime: Date.now() - startTime,
        changesApplied: [],
        preHealingState,
        postHealingState: preHealingState,
        validationPassed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods
  private filterRules(options: any): ConsistencyRule[] {
    return this.consistencyRules.filter(rule => {
      if (!rule.isActive) return false;
      if (options.ruleIds && !options.ruleIds.includes(rule.id)) return false;
      if (options.entityType && rule.entityType !== options.entityType) return false;
      if (options.severity && !options.severity.includes(rule.severity)) return false;
      return true;
    });
  }

  private shouldExecuteRule(rule: ConsistencyRule): boolean {
    if (!rule.lastExecuted) return true;
    const minutesSinceLastExecution = (Date.now() - rule.lastExecuted.getTime()) / (1000 * 60);
    return minutesSinceLastExecution >= rule.executionFrequency;
  }

  private isValidPhoneFormat(phone: string): boolean {
    // Basic phone format validation (can be enhanced)
    const phoneRegex = /^[\+]?[0-9\(\)\-\s]+$/;
    return phoneRegex.test(phone) && phone.length >= 10;
  }

  private standardizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters and standardize
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone; // Return original if can't standardize
  }

  private isValidStageTransition(fromStage: string, toStage: string): boolean {
    // Implement stage transition validation logic
    // This would reference the actual transition rules from LeadLifecycleService
    return true; // Simplified for now
  }

  // Mock data access methods (would be replaced with actual database queries)
  private async getEntitiesToCheck(rule: ConsistencyRule, options: any): Promise<any[]> {
    // Mock implementation - would query database based on entity type and options
    return [];
  }

  private async doesContactExist(contactId: string): Promise<boolean> {
    // Mock implementation
    return Math.random() > 0.1; // 90% chance contact exists
  }

  private async getCallOutcome(callId: string): Promise<any> {
    // Mock implementation
    return Math.random() > 0.2 ? { id: 'outcome_1', callId } : null;
  }

  private async getCampaignAgentAssignments(campaignId: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getAgent(agentId: string): Promise<any> {
    // Mock implementation
    return { id: agentId, status: Math.random() > 0.1 ? 'ACTIVE' : 'INACTIVE' };
  }

  private async getInconsistencyById(id: string): Promise<InconsistencyRecord | null> {
    // Mock implementation
    return null;
  }

  private async getFilteredInconsistencies(options: any): Promise<InconsistencyRecord[]> {
    // Mock implementation
    return [];
  }

  private async getTotalEntitiesChecked(options: any): Promise<number> {
    // Mock implementation
    return 1000;
  }

  private calculateSeverityBreakdown(inconsistencies: InconsistencyRecord[]): ConsistencyReport['severityBreakdown'] {
    const breakdown = {} as ConsistencyReport['severityBreakdown'];
    
    for (const severity of Object.values(InconsistencySeverity)) {
      const severityInconsistencies = inconsistencies.filter(i => i.severity === severity);
      const resolved = severityInconsistencies.filter(i => i.status === ConsistencyStatus.CONSISTENT);
      
      breakdown[severity] = {
        count: severityInconsistencies.length,
        percentage: inconsistencies.length > 0 ? (severityInconsistencies.length / inconsistencies.length) * 100 : 0,
        resolved: resolved.length,
        pending: severityInconsistencies.length - resolved.length
      };
    }
    
    return breakdown;
  }

  private async calculateEntityBreakdown(inconsistencies: InconsistencyRecord[], options: any): Promise<ConsistencyReport['entityBreakdown']> {
    const breakdown = [];
    
    for (const entityType of Object.values(EntityType)) {
      const entityInconsistencies = inconsistencies.filter(i => i.entityType === entityType);
      const totalChecked = await this.getTotalEntitiesCheckedByType(entityType, options);
      
      breakdown.push({
        entityType,
        totalChecked,
        inconsistencies: entityInconsistencies.length,
        consistencyScore: totalChecked > 0 ? Math.max(0, 100 - ((entityInconsistencies.length / totalChecked) * 100)) : 100,
        topIssues: this.getTopIssuesForEntity(entityInconsistencies)
      });
    }
    
    return breakdown;
  }

  private calculateRulePerformance(): ConsistencyReport['rulePerformance'] {
    return this.consistencyRules.map(rule => ({
      ruleId: rule.id,
      ruleName: rule.name,
      executionTime: rule.avgExecutionTime || 0,
      inconsistenciesFound: 0, // Would be calculated from actual data
      successRate: 85 // Mock success rate
    }));
  }

  private async calculateTrendingIssues(options: any): Promise<ConsistencyReport['trendingIssues']> {
    // Mock implementation - would analyze historical data
    return [
      {
        inconsistencyType: 'INVALID_PHONE_FORMAT',
        count: 15,
        trend: 'INCREASING' as const,
        changePercentage: 25
      }
    ];
  }

  private generateRecommendations(inconsistencies: InconsistencyRecord[], severityBreakdown: any): ConsistencyReport['recommendations'] {
    const recommendations = [];
    
    if (severityBreakdown.CRITICAL?.count > 0) {
      recommendations.push({
        priority: 'HIGH' as const,
        category: 'Critical Issues',
        description: `Address ${severityBreakdown.CRITICAL.count} critical data inconsistencies immediately`,
        estimatedImpact: 'High - System integrity at risk',
        suggestedActions: [
          'Review critical inconsistencies manually',
          'Implement immediate healing where possible',
          'Escalate to data team'
        ]
      });
    }
    
    if (inconsistencies.length > 100) {
      recommendations.push({
        priority: 'MEDIUM' as const,
        category: 'Volume Management',
        description: 'High volume of inconsistencies detected',
        estimatedImpact: 'Medium - Operational efficiency affected',
        suggestedActions: [
          'Enable automated healing for low-risk issues',
          'Implement stricter data validation',
          'Review data entry processes'
        ]
      });
    }
    
    return recommendations;
  }

  private calculateDataFreshnessScore(): number {
    // Mock implementation - would calculate based on actual data timestamps
    return 85;
  }

  private async getTotalEntitiesCheckedByType(entityType: EntityType, options: any): Promise<number> {
    // Mock implementation
    return 100;
  }

  private getTopIssuesForEntity(inconsistencies: InconsistencyRecord[]): string[] {
    const issueCount = new Map<string, number>();
    
    inconsistencies.forEach(i => {
      const count = issueCount.get(i.inconsistencyType) || 0;
      issueCount.set(i.inconsistencyType, count + 1);
    });
    
    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue]) => issue);
  }

  private async getEntityState(entityType: EntityType, entityId: string): Promise<any> {
    // Mock implementation - would fetch actual entity state
    return { id: entityId, type: entityType };
  }

  private async executeHealingFunction(healingFunction: string, inconsistency: InconsistencyRecord): Promise<any[]> {
    // Mock implementation - would execute actual healing functions
    return [];
  }

  private async validateHealing(inconsistency: InconsistencyRecord, preState: any, postState: any): Promise<boolean> {
    // Mock implementation - would validate the healing was successful
    return true;
  }

  private emitConsistencyEvent(eventType: string, data: any): void {
    eventEmitter.emit('consistency.event', {
      id: `event_${Date.now()}`,
      type: eventType,
      timestamp: new Date(),
      data
    });
  }

  // Public API methods
  async addConsistencyRule(rule: Omit<ConsistencyRule, 'id'>): Promise<ConsistencyRule> {
    const newRule: ConsistencyRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.consistencyRules.push(newRule);
    return newRule;
  }

  async updateConsistencyRule(ruleId: string, updates: Partial<ConsistencyRule>): Promise<ConsistencyRule | null> {
    const ruleIndex = this.consistencyRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return null;
    
    this.consistencyRules[ruleIndex] = { ...this.consistencyRules[ruleIndex], ...updates };
    return this.consistencyRules[ruleIndex];
  }

  getConsistencyRules(): ConsistencyRule[] {
    return this.consistencyRules;
  }

  async enableRule(ruleId: string): Promise<boolean> {
    const rule = this.consistencyRules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = true;
      return true;
    }
    return false;
  }

  async disableRule(ruleId: string): Promise<boolean> {
    const rule = this.consistencyRules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = false;
      return true;
    }
    return false;
  }
}

export { IntegrationDataConsistencyService };
export default new IntegrationDataConsistencyService();