/**
 * Advanced Audit Service - Organization-scoped user activity tracking and suspicious behavior detection
 * Provides comprehensive audit capabilities with AI-powered threat detection
 */

import { PrismaClient, SuspiciousActivityType, AlertSeverity, SuspiciousAlertStatus } from '@prisma/client';
import { eventManager } from './eventManager';
import { WebSocketService } from './websocketService';

import { prisma } from '../lib/prisma';
export interface ActivityTrackingData {
  userId: string;
  organizationId: string;
  sessionId: string;
  activityType: 'click' | 'page_view' | 'tab_switch' | 'idle_start' | 'idle_end' | 'data_export' | 'login' | 'logout';
  elementType?: string;
  elementId?: string;
  pagePath: string;
  pageTitle?: string;
  timeOnPage?: number;
  clickData?: {
    x: number;
    y: number;
    elementText?: string;
    elementClass?: string;
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  organizationId?: string;
  userId?: string;
  activityType?: string;
  startDate?: Date;
  endDate?: Date;
  pagePath?: string;
  severity?: AlertSeverity;
  reviewStatus?: SuspiciousAlertStatus;
  limit?: number;
  offset?: number;
}

export interface SuspiciousActivityPattern {
  type: SuspiciousActivityType;
  severity: AlertSeverity;
  description: string;
  detectionLogic: (activities: any[]) => boolean;
  alertTitle: (data: any) => string;
}

/**
 * Advanced Audit Service for comprehensive user activity tracking
 */
export class AdvancedAuditService {
  private wsService?: WebSocketService;

  /**
   * Initialize WebSocket service for real-time alerts
   */
  public setWebSocketService(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Track user activity with detailed metadata
   */
  async trackUserActivity(data: ActivityTrackingData): Promise<void> {
    try {
      // Store activity log
      await prisma.userActivityLog.create({
        data: {
          userId: parseInt(data.userId), // Convert string to int
          organizationId: data.organizationId,
          sessionId: data.sessionId,
          activityType: data.activityType,
          elementType: data.elementType,
          elementId: data.elementId,
          pagePath: data.pagePath,
          pageTitle: data.pageTitle,
          timeOnPage: data.timeOnPage,
          clickData: data.clickData ? JSON.stringify(data.clickData) : null,
          metadata: data.metadata ? JSON.stringify({
            ...data.metadata,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent
          }) : null
        }
      });

      // Check for suspicious behavior patterns
      await this.analyzeSuspiciousBehavior(data);

      // Emit real-time update for organization admins
      if (this.wsService) {
        this.wsService.sendToOrganization(data.organizationId, 'user-activity-tracked', {
          userId: data.userId,
          activityType: data.activityType,
          pagePath: data.pagePath,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error tracking user activity:', error);
      throw new Error(`Failed to track user activity: ${error}`);
    }
  }

  /**
   * Get activity logs for an organization with filtering
   */
  async getOrganizationActivityLogs(filters: AuditFilters): Promise<{
    logs: any[];
    total: number;
    summary: {
      totalActivities: number;
      uniqueUsers: number;
      topPages: Array<{ path: string; count: number }>;
      hourlyBreakdown: Array<{ hour: number; count: number }>;
    };
  }> {
    try {
      if (!filters.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Build where clause
      const where: any = {
        organizationId: filters.organizationId,
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.activityType && { activityType: filters.activityType }),
        ...(filters.pagePath && { pagePath: { contains: filters.pagePath, mode: 'insensitive' } }),
        ...(filters.startDate && filters.endDate && {
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        })
      };

      // Get paginated logs
      const [logs, total] = await Promise.all([
        prisma.userActivityLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          skip: filters.offset || 0,
          take: filters.limit || 50
        }),
        prisma.userActivityLog.count({ where })
      ]);

      // Generate summary statistics
      const totalActivities = await prisma.userActivityLog.count({
        where: { organizationId: filters.organizationId }
      });

      const uniqueUsers = await prisma.userActivityLog.groupBy({
        by: ['userId'],
        where: { organizationId: filters.organizationId },
        _count: true
      });

      const topPages = await prisma.userActivityLog.groupBy({
        by: ['pagePath'],
        where: { organizationId: filters.organizationId },
        _count: { pagePath: true },
        orderBy: { _count: { pagePath: 'desc' } },
        take: 10
      });

      const hourlyData = await prisma.$queryRaw<Array<{ hour: number; count: number }>>`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as count
        FROM user_activity_logs
        WHERE "organizationId" = ${filters.organizationId}
          AND timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY hour
      `;

      return {
        logs: logs.map(log => ({
          id: log.id,
          user: {
            id: log.user.id,
            username: log.user.username,
            name: `${log.user.firstName} ${log.user.lastName}`,
            email: log.user.email,
            role: log.user.role
          },
          sessionId: log.sessionId,
          activityType: log.activityType,
          elementType: log.elementType,
          elementId: log.elementId,
          pagePath: log.pagePath,
          pageTitle: log.pageTitle,
          timeOnPage: log.timeOnPage,
          clickData: log.clickData ? JSON.parse(log.clickData) : null,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          timestamp: log.timestamp
        })),
        total,
        summary: {
          totalActivities,
          uniqueUsers: uniqueUsers.length,
          topPages: topPages.map(page => ({
            path: page.pagePath,
            count: page._count.pagePath
          })),
          hourlyBreakdown: hourlyData.map(hour => ({
            hour: Number(hour.hour),
            count: Number(hour.count)
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error getting organization activity logs:', error);
      throw new Error(`Failed to get organization activity logs: ${error}`);
    }
  }

  /**
   * Analyze user behavior for suspicious patterns
   */
  private async analyzeSuspiciousBehavior(data: ActivityTrackingData): Promise<void> {
    try {
      const patterns: SuspiciousActivityPattern[] = [
        {
          type: SuspiciousActivityType.AFTER_HOURS_ACCESS,
          severity: AlertSeverity.MEDIUM,
          description: 'User accessing system outside normal business hours',
          detectionLogic: (activities) => {
            const hour = new Date().getHours();
            return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
          },
          alertTitle: (data) => `After-hours access detected for user ${data.userId}`
        },
        {
          type: SuspiciousActivityType.RAPID_CLICKING,
          severity: AlertSeverity.HIGH,
          description: 'Unusually rapid clicking pattern detected',
          detectionLogic: async (activities) => {
            const recentClicks = await prisma.userActivityLog.count({
              where: {
                userId: parseInt(data.userId), // Convert string to int
                activityType: 'click',
                timestamp: {
                  gte: new Date(Date.now() - 30000) // Last 30 seconds
                }
              }
            });
            return recentClicks > 50; // More than 50 clicks in 30 seconds
          },
          alertTitle: (data) => `Rapid clicking pattern detected for user ${data.userId}`
        },
        {
          type: SuspiciousActivityType.MASS_DATA_EXPORT,
          severity: AlertSeverity.CRITICAL,
          description: 'Multiple data export operations in short timeframe',
          detectionLogic: async (activities) => {
            if (data.activityType === 'data_export') {
              const recentExports = await prisma.userActivityLog.count({
                where: {
                  userId: parseInt(data.userId), // Convert string to int
                  organizationId: data.organizationId,
                  activityType: 'data_export',
                  timestamp: {
                    gte: new Date(Date.now() - 3600000) // Last hour
                  }
                }
              });
              return recentExports > 5; // More than 5 exports in an hour
            }
            return false;
          },
          alertTitle: (data) => `Mass data export detected for user ${data.userId}`
        },
        {
          type: SuspiciousActivityType.UNUSUAL_PAGE_ACCESS,
          severity: AlertSeverity.MEDIUM,
          description: 'Access to administrative pages by non-admin users',
          detectionLogic: async (activities) => {
            if (data.pagePath.includes('/admin') || data.pagePath.includes('/settings')) {
              const user = await prisma.user.findUnique({
                where: { id: parseInt(data.userId) }, // Convert string to int
                select: { role: true }
              });
              return user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN';
            }
            return false;
          },
          alertTitle: (data) => `Unauthorized administrative page access by user ${data.userId}`
        }
      ];

      // Check each pattern
      for (const pattern of patterns) {
        const isTriggered = await pattern.detectionLogic([]);
        
        if (isTriggered) {
          await this.createSuspiciousActivityAlert({
            userId: data.userId,
            organizationId: data.organizationId,
            alertType: pattern.type,
            severity: pattern.severity,
            title: pattern.alertTitle(data),
            description: pattern.description,
            detectionData: {
              activityType: data.activityType,
              pagePath: data.pagePath,
              timestamp: new Date().toISOString(),
              sessionId: data.sessionId,
              metadata: data.metadata
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ Error analyzing suspicious behavior:', error);
    }
  }

  /**
   * Create suspicious activity alert
   */
  private async createSuspiciousActivityAlert(alertData: {
    userId: string;
    organizationId: string;
    alertType: SuspiciousActivityType;
    severity: AlertSeverity;
    title: string;
    description: string;
    detectionData: any;
  }): Promise<void> {
    try {
      // Check if similar alert exists in the last hour
      const existingAlert = await prisma.suspiciousActivityAlert.findFirst({
        where: {
          userId: parseInt(alertData.userId), // Convert string to int
          organizationId: alertData.organizationId,
          alertType: alertData.alertType,
          triggeredAt: {
            gte: new Date(Date.now() - 3600000) // Last hour
          },
          isActive: true
        }
      });

      if (existingAlert) {
        console.log(`⚠️ Similar alert already exists for user ${alertData.userId}, type ${alertData.alertType}`);
        return;
      }

      // Create new alert
      const alert = await prisma.suspiciousActivityAlert.create({
        data: {
          userId: parseInt(alertData.userId), // Convert string to int
          organizationId: alertData.organizationId,
          alertType: alertData.alertType,
          severity: alertData.severity,
          title: alertData.title,
          description: alertData.description,
          detectionData: JSON.stringify(alertData.detectionData)
        }
      });

      console.log(`🚨 Suspicious activity alert created: ${alert.id} - ${alert.title}`);

      // Emit real-time alert to organization admins
      if (this.wsService) {
        this.wsService.sendToOrganization(alertData.organizationId, 'suspicious-activity-alert', {
          alertId: alert.id,
          userId: alertData.userId,
          alertType: alertData.alertType,
          severity: alertData.severity,
          title: alertData.title,
          description: alertData.description,
          timestamp: alert.triggeredAt
        });
      }

    } catch (error) {
      console.error('❌ Error creating suspicious activity alert:', error);
    }
  }

  /**
   * Get suspicious activity alerts for organization
   */
  async getSuspiciousActivityAlerts(filters: AuditFilters): Promise<{
    alerts: any[];
    total: number;
    summary: {
      totalAlerts: number;
      alertsByType: Array<{ type: string; count: number }>;
      alertsBySeverity: Array<{ severity: string; count: number }>;
      recentTrends: Array<{ date: string; count: number }>;
    };
  }> {
    try {
      if (!filters.organizationId) {
        throw new Error('Organization ID is required');
      }

      const where: any = {
        organizationId: filters.organizationId,
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.reviewStatus && { reviewStatus: filters.reviewStatus }),
        ...(filters.startDate && filters.endDate && {
          triggeredAt: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        })
      };

      const [alerts, total] = await Promise.all([
        prisma.suspiciousActivityAlert.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { triggeredAt: 'desc' },
          skip: filters.offset || 0,
          take: filters.limit || 50
        }),
        prisma.suspiciousActivityAlert.count({ where })
      ]);

      // Generate summary statistics
      const totalAlerts = await prisma.suspiciousActivityAlert.count({
        where: { organizationId: filters.organizationId }
      });

      const alertsByType = await prisma.suspiciousActivityAlert.groupBy({
        by: ['alertType'],
        where: { organizationId: filters.organizationId },
        _count: { alertType: true }
      });

      const alertsBySeverity = await prisma.suspiciousActivityAlert.groupBy({
        by: ['severity'],
        where: { organizationId: filters.organizationId },
        _count: { severity: true }
      });

      const recentTrends = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT 
          DATE(triggered_at) as date,
          COUNT(*) as count
        FROM suspicious_activity_alerts
        WHERE organization_id = ${filters.organizationId}
          AND triggered_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(triggered_at)
        ORDER BY date
      `;

      return {
        alerts: alerts.map(alert => ({
          id: alert.id,
          user: {
            id: alert.user.id,
            username: alert.user.username,
            name: `${alert.user.firstName} ${alert.user.lastName}`,
            email: alert.user.email,
            role: alert.user.role
          },
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          detectionData: alert.detectionData ? JSON.parse(alert.detectionData) : null,
          reviewStatus: alert.reviewStatus,
          reviewedBy: alert.reviewedBy,
          reviewedAt: alert.reviewedAt,
          reviewNotes: alert.reviewNotes,
          isActive: alert.isActive,
          triggeredAt: alert.triggeredAt
        })),
        total,
        summary: {
          totalAlerts,
          alertsByType: alertsByType.map(type => ({
            type: type.alertType,
            count: type._count.alertType
          })),
          alertsBySeverity: alertsBySeverity.map(severity => ({
            severity: severity.severity,
            count: severity._count.severity
          })),
          recentTrends: recentTrends.map(trend => ({
            date: trend.date,
            count: Number(trend.count)
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error getting suspicious activity alerts:', error);
      throw new Error(`Failed to get suspicious activity alerts: ${error}`);
    }
  }

  /**
   * Update alert review status
   */
  async updateAlertReviewStatus(
    alertId: string,
    reviewStatus: SuspiciousAlertStatus,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    try {
      await prisma.suspiciousActivityAlert.update({
        where: { id: alertId },
        data: {
          reviewStatus,
          reviewedBy,
          reviewedAt: new Date(),
          reviewNotes,
          isActive: reviewStatus === SuspiciousAlertStatus.RESOLVED ? false : true
        }
      });

      console.log(`✅ Alert ${alertId} review status updated to ${reviewStatus} by ${reviewedBy}`);

    } catch (error) {
      console.error('❌ Error updating alert review status:', error);
      throw new Error(`Failed to update alert review status: ${error}`);
    }
  }

  /**
   * Get user behavior analytics for organization
   */
  async getUserBehaviorAnalytics(organizationId: string, timeRange: '24h' | '7d' | '30d' = '7d'): Promise<{
    userStats: Array<{
      userId: string;
      username: string;
      name: string;
      totalActivities: number;
      avgSessionTime: number;
      topPages: Array<{ path: string; visits: number }>;
      suspiciousAlerts: number;
      lastActive: Date;
    }>;
    organizationMetrics: {
      totalUsers: number;
      totalActivities: number;
      avgActivitiesPerUser: number;
      mostActiveHours: Array<{ hour: number; activities: number }>;
      topPages: Array<{ path: string; visits: number }>;
    };
  }> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);

      const userStats = await prisma.$queryRaw<any[]>`
        SELECT 
          u.id as user_id,
          u.username,
          u.first_name,
          u.last_name,
          COUNT(ua.id) as total_activities,
          AVG(ua.time_on_page) as avg_session_time,
          MAX(ua.timestamp) as last_active,
          COUNT(DISTINCT sa.id) as suspicious_alerts
        FROM users u
        LEFT JOIN user_activity_logs ua ON u.id = ua.user_id 
          AND ua.timestamp >= ${timeFilter}
        LEFT JOIN suspicious_activity_alerts sa ON u.id = sa.user_id 
          AND sa.triggered_at >= ${timeFilter}
        WHERE u.organization_id = ${organizationId}
        GROUP BY u.id, u.username, u.first_name, u.last_name
        ORDER BY total_activities DESC
      `;

      // Get top pages for each user
      const userTopPages = await Promise.all(
        userStats.map(async (user) => {
          const topPages = await prisma.userActivityLog.groupBy({
            by: ['pagePath'],
            where: {
              userId: user.user_id,
              organizationId,
              timestamp: { gte: timeFilter }
            },
            _count: { pagePath: true },
            orderBy: { _count: { pagePath: 'desc' } },
            take: 5
          });
          
          return {
            ...user,
            topPages: topPages.map(page => ({
              path: page.pagePath,
              visits: page._count.pagePath
            }))
          };
        })
      );

      // Get organization-wide metrics
      const [totalActivities, hourlyBreakdown, orgTopPages] = await Promise.all([
        prisma.userActivityLog.count({
          where: {
            organizationId,
            timestamp: { gte: timeFilter }
          }
        }),
        prisma.$queryRaw<Array<{ hour: number; activities: number }>>`
          SELECT 
            EXTRACT(HOUR FROM timestamp) as hour,
            COUNT(*) as activities
          FROM user_activity_logs
          WHERE organization_id = ${organizationId}
            AND timestamp >= ${timeFilter}
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY activities DESC
          LIMIT 5
        `,
        prisma.userActivityLog.groupBy({
          by: ['pagePath'],
          where: {
            organizationId,
            timestamp: { gte: timeFilter }
          },
          _count: { pagePath: true },
          orderBy: { _count: { pagePath: 'desc' } },
          take: 10
        })
      ]);

      return {
        userStats: userTopPages.map(user => ({
          userId: user.user_id,
          username: user.username,
          name: `${user.first_name} ${user.last_name}`,
          totalActivities: Number(user.total_activities),
          avgSessionTime: Number(user.avg_session_time) || 0,
          topPages: user.topPages,
          suspiciousAlerts: Number(user.suspicious_alerts),
          lastActive: user.last_active
        })),
        organizationMetrics: {
          totalUsers: userStats.length,
          totalActivities,
          avgActivitiesPerUser: userStats.length > 0 ? totalActivities / userStats.length : 0,
          mostActiveHours: hourlyBreakdown.map(hour => ({
            hour: Number(hour.hour),
            activities: Number(hour.activities)
          })),
          topPages: orgTopPages.map(page => ({
            path: page.pagePath,
            visits: page._count.pagePath
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error getting user behavior analytics:', error);
      throw new Error(`Failed to get user behavior analytics: ${error}`);
    }
  }

  /**
   * Helper method to get time filter for analytics
   */
  private getTimeFilter(timeRange: '24h' | '7d' | '30d'): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

// Export singleton instance
export const advancedAuditService = new AdvancedAuditService();