import { logger } from './logging';
import { MetricsCollector } from './metrics';
import { EventEmitter } from 'events';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'critical' | 'warning' | 'info';
  condition: AlertCondition;
  cooldownMinutes: number; // Minimum time between alerts of same type
  actions: AlertAction[];
}

export interface AlertCondition {
  type: 'metric_threshold' | 'error_rate' | 'health_status' | 'response_time';
  metric?: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  timeWindowMinutes: number;
  consecutiveBreaches?: number; // Number of consecutive breaches before alerting
}

export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'console';
  config: Record<string, any>;
}

class AlertingSystem extends EventEmitter {
  private static instance: AlertingSystem;
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private ruleStates: Map<string, { lastAlert: Date; breachCount: number }> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private maxAlertsHistory = 1000;

  public static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alerting rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 90%',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'metric_threshold',
          metric: 'memory_heap_usage_percent',
          operator: '>',
          threshold: 90,
          timeWindowMinutes: 5,
          consecutiveBreaches: 2
        },
        cooldownMinutes: 15,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'console', config: {} }
        ]
      },
      {
        id: 'high_response_time',
        name: 'High API Response Time',
        description: 'Alert when P95 response time exceeds 5 seconds',
        enabled: true,
        severity: 'warning',
        condition: {
          type: 'response_time',
          operator: '>',
          threshold: 5000, // 5 seconds in ms
          timeWindowMinutes: 10,
          consecutiveBreaches: 3
        },
        cooldownMinutes: 30,
        actions: [
          { type: 'log', config: { level: 'warn' } },
          { type: 'console', config: {} }
        ]
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'error_rate',
          operator: '>',
          threshold: 5, // 5%
          timeWindowMinutes: 15,
          consecutiveBreaches: 2
        },
        cooldownMinutes: 20,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'console', config: {} }
        ]
      },
      {
        id: 'system_unhealthy',
        name: 'System Health Critical',
        description: 'Alert when system health status is unhealthy',
        enabled: true,
        severity: 'critical',
        condition: {
          type: 'health_status',
          operator: '==',
          threshold: 0, // 0 = unhealthy, 1 = degraded, 2 = healthy
          timeWindowMinutes: 5,
          consecutiveBreaches: 1
        },
        cooldownMinutes: 10,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'console', config: {} }
        ]
      }
    ];

    this.rules = defaultRules;
    logger.info(`Initialized ${defaultRules.length} default alert rules`);
  }

  /**
   * Start the alerting system
   */
  public start(): void {
    if (this.checkInterval) {
      logger.warn('Alerting system is already running');
      return;
    }

    // Check alert rules every 30 seconds
    this.checkInterval = setInterval(() => {
      this.evaluateRules();
    }, 30000);

    logger.info('Alerting system started');
  }

  /**
   * Stop the alerting system
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Alerting system stopped');
    }
  }

  /**
   * Evaluate all alert rules
   */
  private async evaluateRules(): Promise<void> {
    for (const rule of this.rules.filter(r => r.enabled)) {
      try {
        const shouldAlert = await this.evaluateRule(rule);
        
        if (shouldAlert) {
          this.triggerAlert(rule);
        }
      } catch (error) {
        logger.error('Error evaluating alert rule', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const condition = rule.condition;
    const metricsCollector = MetricsCollector.getInstance();
    const timeWindow = new Date(Date.now() - condition.timeWindowMinutes * 60 * 1000);

    let currentValue: number;

    switch (condition.type) {
      case 'metric_threshold':
        if (!condition.metric) {
          logger.error('Metric name is required for metric_threshold condition', { ruleId: rule.id });
          return false;
        }
        
        const aggregated = metricsCollector.getAggregatedMetrics(condition.metric, timeWindow);
        if (!aggregated) {
          return false; // No data available
        }
        
        // Use P95 for threshold evaluation
        currentValue = aggregated.p95;
        break;

      case 'response_time':
        const responseTimeMetrics = metricsCollector.getAggregatedMetrics('http_request_duration', timeWindow);
        if (!responseTimeMetrics) {
          return false;
        }
        currentValue = responseTimeMetrics.p95;
        break;

      case 'error_rate':
        const summary = metricsCollector.getMetricsSummary(condition.timeWindowMinutes);
        currentValue = summary.errorRate;
        break;

      case 'health_status':
        // This would need to be integrated with health check system
        // For now, we'll return false (no alert)
        return false;

      default:
        logger.error('Unknown alert condition type', { 
          ruleId: rule.id, 
          conditionType: condition.type 
        });
        return false;
    }

    // Check if condition is met
    const conditionMet = this.evaluateCondition(currentValue, condition.operator, condition.threshold);
    
    if (!conditionMet) {
      // Reset breach count if condition is not met
      const state = this.ruleStates.get(rule.id);
      if (state) {
        state.breachCount = 0;
      }
      return false;
    }

    // Handle consecutive breaches
    const state = this.ruleStates.get(rule.id) || { lastAlert: new Date(0), breachCount: 0 };
    state.breachCount += 1;

    this.ruleStates.set(rule.id, state);

    // Check if we have enough consecutive breaches
    const requiredBreaches = condition.consecutiveBreaches || 1;
    if (state.breachCount < requiredBreaches) {
      return false;
    }

    // Check cooldown period
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const timeSinceLastAlert = Date.now() - state.lastAlert.getTime();
    
    if (timeSinceLastAlert < cooldownMs) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(value: number, operator: AlertCondition['operator'], threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: rule.severity,
      title: rule.name,
      message: rule.description,
      timestamp: new Date(),
      resolved: false,
      source: 'alerting_system',
      metadata: {
        ruleId: rule.id,
        condition: rule.condition
      }
    };

    this.alerts.push(alert);

    // Update rule state
    const state = this.ruleStates.get(rule.id)!;
    state.lastAlert = new Date();
    state.breachCount = 0; // Reset after triggering

    // Execute alert actions
    this.executeAlertActions(alert, rule.actions);

    // Emit alert event
    this.emit('alert', alert);

    // Clean up old alerts
    this.cleanupOldAlerts();

    logger.warn('Alert triggered', {
      alertId: alert.id,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name
    });
  }

  /**
   * Execute alert actions
   */
  private executeAlertActions(alert: Alert, actions: AlertAction[]): void {
    actions.forEach(action => {
      try {
        switch (action.type) {
          case 'log':
            const level = action.config.level || 'warn';
            logger.log(level, `ALERT: ${alert.title}`, {
              alertId: alert.id,
              message: alert.message,
              severity: alert.type
            });
            break;

          case 'console':
            const color = alert.type === 'critical' ? '\x1b[31m' : alert.type === 'warning' ? '\x1b[33m' : '\x1b[36m';
            console.log(`${color}🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.title}\x1b[0m`);
            console.log(`   ${alert.message}`);
            console.log(`   Time: ${alert.timestamp.toISOString()}`);
            break;

          case 'email':
            // TODO: Implement email notifications
            logger.info('Email alert action not implemented', { alertId: alert.id });
            break;

          case 'webhook':
            // TODO: Implement webhook notifications
            logger.info('Webhook alert action not implemented', { alertId: alert.id });
            break;

          default:
            logger.warn('Unknown alert action type', { 
              alertId: alert.id, 
              actionType: action.type 
            });
        }
      } catch (error) {
        logger.error('Error executing alert action', {
          alertId: alert.id,
          actionType: action.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts with pagination
   */
  public getAlerts(limit: number = 50, offset: number = 0): Alert[] {
    return this.alerts
      .slice()
      .reverse() // Most recent first
      .slice(offset, offset + limit);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    logger.info('Alert resolved', { alertId, resolvedAt: alert.resolvedAt });
    this.emit('alert_resolved', alert);

    return true;
  }

  /**
   * Add or update an alert rule
   */
  public addRule(rule: AlertRule): void {
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
      logger.info('Alert rule updated', { ruleId: rule.id });
    } else {
      this.rules.push(rule);
      logger.info('Alert rule added', { ruleId: rule.id });
    }
  }

  /**
   * Remove an alert rule
   */
  public removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== ruleId);
    
    if (this.rules.length < initialLength) {
      this.ruleStates.delete(ruleId);
      logger.info('Alert rule removed', { ruleId });
      return true;
    }
    
    return false;
  }

  /**
   * Get all alert rules
   */
  public getRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * Get alerting system status
   */
  public getStatus(): {
    running: boolean;
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    totalAlerts: number;
  } {
    return {
      running: this.checkInterval !== null,
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      activeAlerts: this.getActiveAlerts().length,
      totalAlerts: this.alerts.length
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldAlerts(): void {
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }
  }
}

export default AlertingSystem;