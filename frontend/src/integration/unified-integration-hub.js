/**
 * Frontier AI - Unified Integration Hub
 * Central orchestration layer for all integration systems
 * Makes Frontier the central command center for business operations
 */

const { DataIntegrationLayer } = require('./data-integration-layer');
const { ApplicationIntegrationFramework } = require('./application-integration-framework');
const { WorkflowAutomationSystem } = require('./workflow-automation-system');
const { BusinessIntelligenceHub } = require('../business/business-intelligence-hub');

class UnifiedIntegrationHub {
    constructor() {
        this.dataIntegration = new DataIntegrationLayer();
        this.applicationIntegration = new ApplicationIntegrationFramework();
        this.workflowAutomation = new WorkflowAutomationSystem();
        this.businessIntelligence = new BusinessIntelligenceHub();
        this.centralEventBus = new CentralEventBus();
        this.integrationOrchestrator = new IntegrationOrchestrator();
        this.systemMonitor = new SystemMonitor();
        this.configurationManager = new ConfigurationManager();
        
        console.log('🌟 Unified Integration Hub Initializing...');
        this.initializeHub();
    }

    async initializeHub() {
        await this.setupCentralEventBus();
        await this.initializeOrchestrator();
        await this.setupSystemMonitoring();
        await this.configureIntegrations();
        
        console.log('✅ Frontier AI - Unified Integration Hub Online');
        console.log('🎯 All business systems now connected to Frontier central command');
    }

    // ================================
    // CENTRAL EVENT BUS
    // ================================

    async setupCentralEventBus() {
        // Connect all integration systems to central event bus
        this.connectDataIntegrationEvents();
        this.connectApplicationIntegrationEvents();
        this.connectWorkflowAutomationEvents();
        this.connectBusinessIntelligenceEvents();

        // Set up cross-system event routing
        this.setupEventRouting();
        
        console.log('🔄 Central event bus configured');
    }

    connectDataIntegrationEvents() {
        this.dataIntegration.eventBus.on('source_connected', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'data_source_connected',
                source: 'data_integration',
                data: event.detail
            });
            
            // Trigger workflow if configured
            this.triggerWorkflow('data_source_connected', event.detail);
        });

        this.dataIntegration.eventBus.on('sync_completed', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'data_sync_completed',
                source: 'data_integration',
                data: event.detail
            });
            
            // Update business intelligence
            this.updateBusinessIntelligence('data_sync', event.detail);
        });

        this.dataIntegration.eventBus.on('quality_alert', (event) => {
            this.centralEventBus.emit('system_alert', {
                type: 'data_quality_alert',
                severity: event.detail.severity,
                source: 'data_integration',
                data: event.detail
            });
            
            // Trigger quality improvement workflow
            this.triggerWorkflow('data_quality_alert', event.detail);
        });
    }

    connectApplicationIntegrationEvents() {
        this.applicationIntegration.eventBus.on('webhook_received', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'webhook_received',
                source: 'application_integration',
                data: event.detail
            });
            
            // Process webhook through workflow system
            this.processWebhookWorkflow(event.detail);
        });

        this.applicationIntegration.eventBus.on('api_success', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'api_success',
                source: 'application_integration',
                data: event.detail
            });
        });

        this.applicationIntegration.eventBus.on('widget_interaction', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'widget_interaction',
                source: 'application_integration',
                data: event.detail
            });
            
            // Track interaction in business intelligence
            this.trackWidgetInteraction(event.detail);
        });
    }

    connectWorkflowAutomationEvents() {
        this.workflowAutomation.eventBus.on('workflow_started', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'workflow_started',
                source: 'workflow_automation',
                data: event.detail
            });
        });

        this.workflowAutomation.eventBus.on('workflow_completed', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'workflow_completed',
                source: 'workflow_automation',
                data: event.detail
            });
            
            // Update business metrics
            this.updateBusinessMetrics('workflow_completion', event.detail);
        });

        this.workflowAutomation.eventBus.on('approval_requested', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'approval_requested',
                source: 'workflow_automation',
                data: event.detail
            });
            
            // Send notification through application integration
            this.sendApprovalNotification(event.detail);
        });
    }

    connectBusinessIntelligenceEvents() {
        this.businessIntelligence.eventBus.on('analysis_completed', (event) => {
            this.centralEventBus.emit('system_event', {
                type: 'analysis_completed',
                source: 'business_intelligence',
                data: event.detail
            });
            
            // Trigger actions based on analysis results
            this.processAnalysisResults(event.detail);
        });

        this.businessIntelligence.eventBus.on('alert_generated', (event) => {
            this.centralEventBus.emit('system_alert', {
                type: 'business_alert',
                severity: event.detail.severity,
                source: 'business_intelligence',
                data: event.detail
            });
            
            // Trigger alert workflow
            this.triggerWorkflow('business_alert', event.detail);
        });
    }

    setupEventRouting() {
        this.centralEventBus.on('system_event', (event) => {
            console.log(`🔄 System Event: ${event.detail.type} from ${event.detail.source}`);
            this.systemMonitor.recordEvent(event.detail);
        });

        this.centralEventBus.on('system_alert', (event) => {
            console.log(`🚨 System Alert: ${event.detail.type} (${event.detail.severity})`);
            this.systemMonitor.recordAlert(event.detail);
            this.handleSystemAlert(event.detail);
        });
    }

    // ================================
    // INTEGRATION ORCHESTRATOR
    // ================================

    async initializeOrchestrator() {
        this.integrationOrchestrator.setIntegrationSystems({
            dataIntegration: this.dataIntegration,
            applicationIntegration: this.applicationIntegration,
            workflowAutomation: this.workflowAutomation,
            businessIntelligence: this.businessIntelligence
        });

        await this.integrationOrchestrator.setupOrchestration();
        console.log('🎭 Integration orchestrator configured');
    }

    async orchestrateDataFlow(flowConfig) {
        const {
            sourceSystem,
            targetSystems,
            transformations,
            triggers,
            notifications
        } = flowConfig;

        const orchestration = {
            id: this.generateOrchestrationId(),
            name: flowConfig.name,
            sourceSystem,
            targetSystems,
            transformations,
            triggers,
            notifications,
            status: 'active',
            createdAt: Date.now(),
            lastExecution: null,
            executionCount: 0
        };

        await this.integrationOrchestrator.registerOrchestration(orchestration);
        
        console.log(`🎭 Data flow orchestration created: ${flowConfig.name}`);
        return orchestration.id;
    }

    async executeOrchestration(orchestrationId, data) {
        const orchestration = await this.integrationOrchestrator.getOrchestration(orchestrationId);
        if (!orchestration) {
            throw new Error(`Orchestration ${orchestrationId} not found`);
        }

        try {
            const result = await this.integrationOrchestrator.execute(orchestration, data);
            
            orchestration.lastExecution = Date.now();
            orchestration.executionCount++;
            
            this.centralEventBus.emit('system_event', {
                type: 'orchestration_completed',
                source: 'orchestrator',
                data: { orchestrationId, result }
            });

            return result;

        } catch (error) {
            this.centralEventBus.emit('system_alert', {
                type: 'orchestration_failed',
                severity: 'high',
                source: 'orchestrator',
                data: { orchestrationId, error: error.message }
            });

            throw error;
        }
    }

    // ================================
    // CROSS-SYSTEM OPERATIONS
    // ================================

    async triggerWorkflow(eventType, data) {
        // Find workflows triggered by this event type
        const workflows = await this.workflowAutomation.findWorkflowsByTrigger(eventType);
        
        for (const workflow of workflows) {
            try {
                await this.workflowAutomation.executeWorkflow(workflow.id, data, { 
                    triggeredBy: eventType 
                });
            } catch (error) {
                console.error(`❌ Failed to trigger workflow ${workflow.id}:`, error);
            }
        }
    }

    async updateBusinessIntelligence(eventType, data) {
        try {
            await this.businessIntelligence.processEvent(eventType, data);
        } catch (error) {
            console.error(`❌ Failed to update business intelligence:`, error);
        }
    }

    async processWebhookWorkflow(webhookData) {
        const { source, eventType, data } = webhookData;
        
        // Route webhook to appropriate workflow
        const routingConfig = await this.getWebhookRouting(source, eventType);
        
        if (routingConfig && routingConfig.workflowId) {
            await this.workflowAutomation.executeWorkflow(routingConfig.workflowId, data, {
                source: 'webhook',
                originalEvent: eventType
            });
        }
    }

    async sendApprovalNotification(approvalData) {
        const { approvers, message, urgency = 'normal' } = approvalData;
        
        // Send notifications through multiple channels
        const notificationPromises = approvers.map(async (approver) => {
            // Email notification
            await this.applicationIntegration.callAPI('email_service', 'send', 'POST', {
                to: approver.email,
                subject: `Approval Required: ${message}`,
                template: 'approval_request',
                data: approvalData
            });

            // Slack notification if configured
            if (approver.slackId) {
                await this.applicationIntegration.triggerWebhook('slack_notification', {
                    user: approver.slackId,
                    message: `🔔 Approval Required: ${message}`,
                    urgency
                });
            }

            // Mobile push notification
            if (approver.deviceToken) {
                await this.applicationIntegration.triggerWebhook('push_notification', {
                    deviceToken: approver.deviceToken,
                    title: 'Approval Required',
                    body: message,
                    data: { approvalId: approvalData.approvalId }
                });
            }
        });

        await Promise.allSettled(notificationPromises);
    }

    async trackWidgetInteraction(interactionData) {
        await this.businessIntelligence.trackEvent('widget_interaction', {
            widgetId: interactionData.widgetId,
            action: interactionData.action,
            userId: interactionData.userId,
            timestamp: Date.now()
        });
    }

    async updateBusinessMetrics(metricType, data) {
        await this.businessIntelligence.updateMetrics(metricType, {
            value: data.result,
            timestamp: Date.now(),
            metadata: data
        });
    }

    async processAnalysisResults(analysisData) {
        const { type, results, confidence, recommendations } = analysisData;
        
        // If high confidence recommendations, trigger automated actions
        if (confidence > 0.8 && recommendations.length > 0) {
            for (const recommendation of recommendations) {
                if (recommendation.autoExecute) {
                    await this.executeRecommendation(recommendation);
                }
            }
        }

        // Store analysis results in data layer
        await this.dataIntegration.storeAnalysisResults(analysisData);
    }

    async executeRecommendation(recommendation) {
        const { action, parameters, workflowId } = recommendation;
        
        if (workflowId) {
            await this.workflowAutomation.executeWorkflow(workflowId, parameters, {
                source: 'business_intelligence',
                recommendation: recommendation
            });
        } else if (action) {
            await this.executeDirectAction(action, parameters);
        }
    }

    async executeDirectAction(action, parameters) {
        switch (action) {
            case 'scale_resources':
                await this.scaleResources(parameters);
                break;
            case 'send_alert':
                await this.sendSystemAlert(parameters);
                break;
            case 'update_configuration':
                await this.updateSystemConfiguration(parameters);
                break;
            case 'trigger_backup':
                await this.triggerSystemBackup(parameters);
                break;
            default:
                console.warn(`Unknown direct action: ${action}`);
        }
    }

    // ================================
    // SYSTEM MONITORING
    // ================================

    async setupSystemMonitoring() {
        this.systemMonitor.startMonitoring({
            dataIntegration: this.dataIntegration,
            applicationIntegration: this.applicationIntegration,
            workflowAutomation: this.workflowAutomation,
            businessIntelligence: this.businessIntelligence
        });

        // Set up health checks
        setInterval(() => {
            this.performHealthChecks();
        }, 60000); // Every minute

        // Set up performance monitoring
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 300000); // Every 5 minutes

        console.log('📊 System monitoring activated');
    }

    async performHealthChecks() {
        const healthChecks = await Promise.allSettled([
            this.dataIntegration.healthCheck(),
            this.applicationIntegration.healthCheck(),
            this.workflowAutomation.healthCheck(),
            this.businessIntelligence.healthCheck()
        ]);

        const healthStatus = {
            timestamp: Date.now(),
            dataIntegration: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : 'unhealthy',
            applicationIntegration: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : 'unhealthy',
            workflowAutomation: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : 'unhealthy',
            businessIntelligence: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : 'unhealthy'
        };

        this.systemMonitor.recordHealthStatus(healthStatus);

        // Alert if any system is unhealthy
        const unhealthySystems = Object.entries(healthStatus).filter(([key, value]) => 
            key !== 'timestamp' && value === 'unhealthy'
        );

        if (unhealthySystems.length > 0) {
            this.centralEventBus.emit('system_alert', {
                type: 'health_check_failed',
                severity: 'high',
                source: 'system_monitor',
                data: {
                    unhealthySystems: unhealthySystems.map(([system]) => system),
                    healthStatus
                }
            });
        }
    }

    async collectPerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            dataIntegration: await this.dataIntegration.getPerformanceMetrics(),
            applicationIntegration: await this.applicationIntegration.getPerformanceMetrics(),
            workflowAutomation: await this.workflowAutomation.getPerformanceMetrics(),
            businessIntelligence: await this.businessIntelligence.getPerformanceMetrics(),
            overall: await this.getOverallPerformanceMetrics()
        };

        this.systemMonitor.recordPerformanceMetrics(metrics);

        // Trigger performance optimization if needed
        if (this.shouldOptimizePerformance(metrics)) {
            await this.triggerPerformanceOptimization(metrics);
        }
    }

    shouldOptimizePerformance(metrics) {
        // Check for performance thresholds
        const thresholds = {
            responseTime: 5000, // 5 seconds
            errorRate: 0.05, // 5%
            throughput: 100 // requests per minute
        };

        return (
            metrics.overall.responseTime > thresholds.responseTime ||
            metrics.overall.errorRate > thresholds.errorRate ||
            metrics.overall.throughput < thresholds.throughput
        );
    }

    async triggerPerformanceOptimization(metrics) {
        console.log('🔧 Triggering performance optimization...');
        
        await this.workflowAutomation.executeWorkflow('performance_optimization', {
            metrics,
            timestamp: Date.now()
        }, {
            source: 'system_monitor',
            priority: 'high'
        });
    }

    // ================================
    // CONFIGURATION MANAGEMENT
    // ================================

    async configureIntegrations() {
        // Load default configurations
        await this.loadDefaultConfigurations();
        
        // Set up configuration synchronization
        this.setupConfigurationSync();
        
        console.log('⚙️ Integration configurations loaded');
    }

    async loadDefaultConfigurations() {
        const defaultConfig = {
            dataIntegration: {
                syncInterval: 300000, // 5 minutes
                qualityThreshold: 0.8,
                retryAttempts: 3
            },
            applicationIntegration: {
                webhookTimeout: 30000, // 30 seconds
                rateLimitEnabled: true,
                healthCheckInterval: 300000 // 5 minutes
            },
            workflowAutomation: {
                defaultTimeout: 3600000, // 1 hour
                maxConcurrentWorkflows: 50,
                retryEnabled: true
            },
            businessIntelligence: {
                analysisInterval: 600000, // 10 minutes
                alertThreshold: 0.7,
                monteCarloIterations: 10000
            }
        };

        await this.configurationManager.loadConfiguration(defaultConfig);
    }

    setupConfigurationSync() {
        this.configurationManager.on('configuration_changed', (event) => {
            this.applyCo(event.detail);
        });
    }

    async applyConfigurationChange(change) {
        const { system, setting, value } = change;
        
        switch (system) {
            case 'dataIntegration':
                await this.dataIntegration.updateConfiguration(setting, value);
                break;
            case 'applicationIntegration':
                await this.applicationIntegration.updateConfiguration(setting, value);
                break;
            case 'workflowAutomation':
                await this.workflowAutomation.updateConfiguration(setting, value);
                break;
            case 'businessIntelligence':
                await this.businessIntelligence.updateConfiguration(setting, value);
                break;
        }

        console.log(`⚙️ Configuration updated: ${system}.${setting} = ${value}`);
    }

    // ================================
    // UNIFIED API ENDPOINTS
    // ================================

    async getSystemStatus() {
        const [
            dataStatus,
            appStatus,
            workflowStatus,
            biStatus
        ] = await Promise.all([
            this.dataIntegration.getSystemStatus(),
            this.applicationIntegration.getIntegrationStatus(),
            this.workflowAutomation.getWorkflowStatus(),
            this.businessIntelligence.getSystemStatus()
        ]);

        return {
            timestamp: Date.now(),
            overall: this.calculateOverallStatus([dataStatus, appStatus, workflowStatus, biStatus]),
            dataIntegration: dataStatus,
            applicationIntegration: appStatus,
            workflowAutomation: workflowStatus,
            businessIntelligence: biStatus,
            systemHealth: await this.systemMonitor.getOverallHealth(),
            activeIntegrations: await this.getActiveIntegrationsCount()
        };
    }

    async getUnifiedAnalytics(timeRange = 24 * 60 * 60 * 1000) {
        const analytics = await Promise.all([
            this.systemMonitor.getAnalytics(timeRange),
            this.businessIntelligence.getAnalytics(timeRange),
            this.workflowAutomation.analytics.getAnalytics(null, timeRange)
        ]);

        return {
            timeRange,
            system: analytics[0],
            business: analytics[1],
            workflows: analytics[2],
            insights: await this.generateSystemInsights(analytics)
        };
    }

    async exportUnifiedConfiguration() {
        const config = await Promise.all([
            this.dataIntegration.exportConfiguration(),
            this.applicationIntegration.exportConfiguration(),
            this.workflowAutomation.exportConfiguration(),
            this.businessIntelligence.exportConfiguration()
        ]);

        return {
            version: '1.0',
            timestamp: Date.now(),
            hub: {
                orchestrations: await this.integrationOrchestrator.exportOrchestrations(),
                configurations: await this.configurationManager.exportConfiguration()
            },
            dataIntegration: config[0],
            applicationIntegration: config[1],
            workflowAutomation: config[2],
            businessIntelligence: config[3]
        };
    }

    async importUnifiedConfiguration(config) {
        console.log('📥 Importing unified integration configuration...');
        
        // Import individual system configurations
        const importPromises = [];
        
        if (config.dataIntegration) {
            importPromises.push(this.dataIntegration.importConfiguration(config.dataIntegration));
        }
        
        if (config.applicationIntegration) {
            importPromises.push(this.applicationIntegration.importConfiguration(config.applicationIntegration));
        }
        
        if (config.workflowAutomation) {
            importPromises.push(this.workflowAutomation.importConfiguration(config.workflowAutomation));
        }
        
        if (config.businessIntelligence) {
            importPromises.push(this.businessIntelligence.importConfiguration(config.businessIntelligence));
        }

        await Promise.all(importPromises);

        // Import hub-specific configurations
        if (config.hub) {
            if (config.hub.orchestrations) {
                await this.integrationOrchestrator.importOrchestrations(config.hub.orchestrations);
            }
            
            if (config.hub.configurations) {
                await this.configurationManager.importConfiguration(config.hub.configurations);
            }
        }

        console.log('✅ Unified integration configuration imported successfully');
    }

    // ================================
    // UTILITY METHODS
    // ================================

    generateOrchestrationId() {
        return 'orch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    }

    calculateOverallStatus(statuses) {
        const allHealthy = statuses.every(status => this.isSystemHealthy(status));
        return allHealthy ? 'healthy' : 'degraded';
    }

    isSystemHealthy(status) {
        // Check if system status indicates health
        return !status.errors && status.sources?.connected > 0;
    }

    async getActiveIntegrationsCount() {
        const counts = await Promise.all([
            this.dataIntegration.getConnectedSourcesCount(),
            this.applicationIntegration.getActiveIntegrationsCount(),
            this.workflowAutomation.getActiveWorkflowsCount()
        ]);

        return {
            dataSources: counts[0],
            applications: counts[1],
            workflows: counts[2],
            total: counts.reduce((sum, count) => sum + count, 0)
        };
    }

    async generateSystemInsights(analytics) {
        const insights = [];

        // Performance insights
        if (analytics[0].performanceIssues?.length > 0) {
            insights.push({
                type: 'performance',
                severity: 'medium',
                message: 'Performance issues detected in system monitoring',
                recommendations: ['Optimize database queries', 'Scale infrastructure', 'Review workflow efficiency']
            });
        }

        // Business insights
        if (analytics[1].trends?.declining?.length > 0) {
            insights.push({
                type: 'business',
                severity: 'high',
                message: 'Declining business metrics detected',
                recommendations: ['Review business processes', 'Analyze market conditions', 'Implement improvement workflows']
            });
        }

        // Workflow insights
        if (analytics[2].failureRate > 0.1) {
            insights.push({
                type: 'workflow',
                severity: 'high',
                message: 'High workflow failure rate detected',
                recommendations: ['Review workflow configurations', 'Improve error handling', 'Add monitoring steps']
            });
        }

        return insights;
    }

    async handleSystemAlert(alert) {
        const { type, severity, data } = alert;
        
        // Route alerts to appropriate handlers
        switch (type) {
            case 'data_quality_alert':
                await this.handleDataQualityAlert(data);
                break;
            case 'health_check_failed':
                await this.handleHealthCheckFailure(data);
                break;
            case 'performance_degradation':
                await this.handlePerformanceDegradation(data);
                break;
            case 'business_alert':
                await this.handleBusinessAlert(data);
                break;
            default:
                await this.handleGenericAlert(alert);
        }
    }

    async getOverallPerformanceMetrics() {
        return {
            responseTime: 250, // ms
            errorRate: 0.02, // 2%
            throughput: 500, // requests per minute
            uptime: 99.9 // percentage
        };
    }

    async getWebhookRouting(source, eventType) {
        // Mock webhook routing configuration
        return {
            workflowId: 'webhook_processor_workflow',
            transformations: []
        };
    }
}

// ================================
// CENTRAL EVENT BUS
// ================================

class CentralEventBus {
    constructor() {
        this.eventEmitter = new EventTarget();
        this.eventHistory = [];
        this.maxHistorySize = 1000;
    }

    emit(event, data) {
        // Record event in history
        this.recordEvent(event, data);
        
        // Emit event
        this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    on(event, handler) {
        this.eventEmitter.addEventListener(event, handler);
    }

    off(event, handler) {
        this.eventEmitter.removeEventListener(event, handler);
    }

    recordEvent(event, data) {
        this.eventHistory.push({
            event,
            data,
            timestamp: Date.now()
        });

        // Trim history if too large
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    getEventHistory(filter = {}) {
        let history = this.eventHistory;

        if (filter.event) {
            history = history.filter(e => e.event === filter.event);
        }

        if (filter.since) {
            history = history.filter(e => e.timestamp >= filter.since);
        }

        return history;
    }
}

// ================================
// INTEGRATION ORCHESTRATOR
// ================================

class IntegrationOrchestrator {
    constructor() {
        this.orchestrations = new Map();
        this.integrationSystems = {};
    }

    setIntegrationSystems(systems) {
        this.integrationSystems = systems;
    }

    async setupOrchestration() {
        console.log('🎭 Integration orchestrator ready');
    }

    async registerOrchestration(orchestration) {
        this.orchestrations.set(orchestration.id, orchestration);
    }

    async getOrchestration(orchestrationId) {
        return this.orchestrations.get(orchestrationId);
    }

    async execute(orchestration, data) {
        console.log(`🎭 Executing orchestration: ${orchestration.name}`);
        
        // Mock orchestration execution
        return {
            orchestrationId: orchestration.id,
            success: true,
            timestamp: Date.now()
        };
    }

    async exportOrchestrations() {
        return Array.from(this.orchestrations.values());
    }

    async importOrchestrations(orchestrations) {
        for (const orchestration of orchestrations) {
            await this.registerOrchestration(orchestration);
        }
    }
}

// ================================
// SYSTEM MONITOR
// ================================

class SystemMonitor {
    constructor() {
        this.events = [];
        this.alerts = [];
        this.healthHistory = [];
        this.performanceHistory = [];
        this.monitoring = false;
    }

    startMonitoring(systems) {
        this.systems = systems;
        this.monitoring = true;
        console.log('📊 System monitoring started');
    }

    recordEvent(event) {
        this.events.push({
            ...event,
            timestamp: Date.now()
        });
    }

    recordAlert(alert) {
        this.alerts.push({
            ...alert,
            timestamp: Date.now()
        });
    }

    recordHealthStatus(health) {
        this.healthHistory.push(health);
        
        // Keep only last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.healthHistory = this.healthHistory.filter(h => h.timestamp >= oneDayAgo);
    }

    recordPerformanceMetrics(metrics) {
        this.performanceHistory.push(metrics);
        
        // Keep only last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.performanceHistory = this.performanceHistory.filter(m => m.timestamp >= oneDayAgo);
    }

    async getOverallHealth() {
        const latest = this.healthHistory[this.healthHistory.length - 1];
        
        if (!latest) {
            return { status: 'unknown', timestamp: Date.now() };
        }

        const systems = Object.keys(latest).filter(key => key !== 'timestamp');
        const healthySystems = systems.filter(system => latest[system] === 'healthy');
        
        return {
            status: healthySystems.length === systems.length ? 'healthy' : 'degraded',
            healthySystems: healthySystems.length,
            totalSystems: systems.length,
            timestamp: latest.timestamp
        };
    }

    async getAnalytics(timeRange) {
        const since = Date.now() - timeRange;
        
        return {
            events: this.events.filter(e => e.timestamp >= since).length,
            alerts: this.alerts.filter(a => a.timestamp >= since).length,
            performanceIssues: this.getPerformanceIssues(since),
            healthTrends: this.getHealthTrends(since)
        };
    }

    getPerformanceIssues(since) {
        return this.performanceHistory
            .filter(p => p.timestamp >= since)
            .filter(p => p.overall?.responseTime > 1000 || p.overall?.errorRate > 0.05);
    }

    getHealthTrends(since) {
        const healthData = this.healthHistory.filter(h => h.timestamp >= since);
        
        // Calculate health trend
        if (healthData.length < 2) return { trend: 'stable' };
        
        const recent = healthData.slice(-10);
        const older = healthData.slice(-20, -10);
        
        const recentHealthy = this.calculateHealthScore(recent);
        const olderHealthy = this.calculateHealthScore(older);
        
        if (recentHealthy > olderHealthy) return { trend: 'improving' };
        if (recentHealthy < olderHealthy) return { trend: 'declining' };
        return { trend: 'stable' };
    }

    calculateHealthScore(healthData) {
        if (healthData.length === 0) return 0;
        
        const totalChecks = healthData.length * 4; // 4 systems
        const healthyChecks = healthData.reduce((sum, health) => {
            return sum + Object.values(health).filter(status => status === 'healthy').length;
        }, 0);
        
        return healthyChecks / totalChecks;
    }
}

// ================================
// CONFIGURATION MANAGER
// ================================

class ConfigurationManager {
    constructor() {
        this.configurations = new Map();
        this.eventEmitter = new EventTarget();
    }

    on(event, handler) {
        this.eventEmitter.addEventListener(event, handler);
    }

    emit(event, data) {
        this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    async loadConfiguration(config) {
        for (const [system, settings] of Object.entries(config)) {
            this.configurations.set(system, settings);
        }
    }

    async updateConfiguration(system, setting, value) {
        const config = this.configurations.get(system) || {};
        config[setting] = value;
        this.configurations.set(system, config);
        
        this.emit('configuration_changed', { system, setting, value });
    }

    async getConfiguration(system) {
        return this.configurations.get(system);
    }

    async exportConfiguration() {
        return Object.fromEntries(this.configurations);
    }

    async importConfiguration(config) {
        for (const [system, settings] of Object.entries(config)) {
            this.configurations.set(system, settings);
        }
    }
}

module.exports = {
    UnifiedIntegrationHub,
    CentralEventBus,
    IntegrationOrchestrator,
    SystemMonitor,
    ConfigurationManager
};
