// Audit trail utility for pause events compliance monitoring
import { prisma } from '../database';

interface PauseEventAuditData {
  agentId: string;
  agentName: string;
  eventType: string;
  pauseReason: string;
  pauseCategory?: string;
  duration?: number;
  action: 'PAUSE_STARTED' | 'PAUSE_ENDED' | 'PAUSE_VIEWED' | 'PAUSE_MODIFIED' | 'PAUSE_DELETED';
  previousValues?: any;
  newValues?: any;
  supervisorId?: string;
  complianceContext?: {
    shiftStartTime?: string;
    totalBreakTimeToday?: number;
    remainingBreakAllowance?: number;
    complianceViolation?: boolean;
    violationReason?: string;
  };
}

interface UserAccessAuditData {
  userId: string;
  userRole: string;
  accessedAgentId?: string;
  accessedAgentName?: string;
  dataType: 'PAUSE_EVENTS' | 'PAUSE_STATS' | 'PAUSE_REPORT';
  accessLevel: 'READ' | 'WRITE' | 'DELETE';
  dataScope: 'OWN' | 'TEAM' | 'ALL';
  filterParams?: any;
}

export class PauseEventAuditManager {
  
  /**
   * Log pause event for compliance monitoring
   */
  static async logPauseEvent(
    auditData: PauseEventAuditData,
    metadata: {
      performedByUserId: string;
      performedByUserEmail: string;
      performedByUserName: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: auditData.action,
          entityType: 'PAUSE_EVENT',
          entityId: auditData.agentId,
          performedByUserId: metadata.performedByUserId,
          performedByUserEmail: metadata.performedByUserEmail,
          performedByUserName: metadata.performedByUserName,
          ipAddress: metadata.ipAddress || 'unknown',
          userAgent: metadata.userAgent || 'unknown',
          sessionId: metadata.sessionId,
          previousValues: auditData.previousValues ? JSON.stringify(auditData.previousValues) : null,
          newValues: JSON.stringify({
            agentId: auditData.agentId,
            agentName: auditData.agentName,
            eventType: auditData.eventType,
            pauseReason: auditData.pauseReason,
            pauseCategory: auditData.pauseCategory,
            duration: auditData.duration,
            complianceContext: auditData.complianceContext
          }),
          metadata: JSON.stringify({
            auditType: 'PAUSE_EVENT_COMPLIANCE',
            complianceRequired: true,
            retentionPeriod: '7_YEARS', // Compliance requirement
            sensitivityLevel: 'MEDIUM',
            supervisorId: auditData.supervisorId,
            timestamp: new Date().toISOString()
          }),
          severity: this.determineSeverity(auditData),
        }
      });

      // Check for compliance violations and create security events if needed
      if (auditData.complianceContext?.complianceViolation) {
        await this.createComplianceSecurityEvent(auditData, metadata);
      }

      console.log(`📊 Audit logged: ${auditData.action} for agent ${auditData.agentId}`);

    } catch (error) {
      console.error('❌ Failed to log pause event audit:', error);
      // Don't throw - audit failures shouldn't break business operations
    }
  }

  /**
   * Log user access to pause data for role-based monitoring
   */
  static async logUserAccess(
    accessData: UserAccessAuditData,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      // Determine if this access requires special monitoring
      const sensitiveAccess = (
        accessData.dataScope === 'ALL' ||
        (accessData.accessedAgentId && accessData.accessedAgentId !== accessData.userId) ||
        accessData.accessLevel !== 'READ'
      );

      await prisma.auditLog.create({
        data: {
          action: `PAUSE_DATA_${accessData.accessLevel}`,
          entityType: accessData.dataType,
          entityId: accessData.accessedAgentId || 'BULK_ACCESS',
          performedByUserId: accessData.userId,
          performedByUserEmail: '', // Will be populated by middleware
          performedByUserName: '', // Will be populated by middleware
          ipAddress: metadata.ipAddress || 'unknown',
          userAgent: metadata.userAgent || 'unknown',
          sessionId: metadata.sessionId,
          newValues: JSON.stringify({
            accessedAgentId: accessData.accessedAgentId,
            accessedAgentName: accessData.accessedAgentName,
            dataType: accessData.dataType,
            accessLevel: accessData.accessLevel,
            dataScope: accessData.dataScope,
            filterParams: accessData.filterParams
          }),
          metadata: JSON.stringify({
            auditType: 'DATA_ACCESS_MONITORING',
            sensitiveAccess,
            userRole: accessData.userRole,
            complianceRequired: true,
            timestamp: new Date().toISOString()
          }),
          severity: sensitiveAccess ? 'HIGH' : 'INFO',
        }
      });

      console.log(`🔍 Access audit logged: ${accessData.userRole} accessed ${accessData.dataType}`);

    } catch (error) {
      console.error('❌ Failed to log user access audit:', error);
    }
  }

  /**
   * Create compliance security event for violations
   */
  private static async createComplianceSecurityEvent(
    auditData: PauseEventAuditData,
    metadata: any
  ): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          type: 'COMPLIANCE_VIOLATION',
          ip: metadata.ipAddress || 'unknown',
          userAgent: metadata.userAgent || 'unknown',
          email: metadata.performedByUserEmail,
          endpoint: '/api/pause-events',
          body: JSON.stringify({
            violationType: 'BREAK_TIME_VIOLATION',
            agentId: auditData.agentId,
            agentName: auditData.agentName,
            violationReason: auditData.complianceContext?.violationReason,
            complianceContext: auditData.complianceContext
          }),
          severity: 'HIGH'
        }
      });

      console.log(`🚨 Compliance violation security event created for agent ${auditData.agentId}`);

    } catch (error) {
      console.error('❌ Failed to create compliance security event:', error);
    }
  }

  /**
   * Determine audit log severity based on context
   */
  private static determineSeverity(auditData: PauseEventAuditData): string {
    if (auditData.complianceContext?.complianceViolation) {
      return 'HIGH';
    }
    
    if (auditData.action === 'PAUSE_DELETED' || auditData.action === 'PAUSE_MODIFIED') {
      return 'MEDIUM';
    }

    return 'INFO';
  }

  /**
   * Generate compliance report for audit purposes
   */
  static async generateComplianceReport(
    dateFrom: Date,
    dateTo: Date,
    agentId?: string
  ): Promise<{
    pauseEvents: any[];
    auditTrail: any[];
    complianceMetrics: any;
    violations: any[];
  }> {
    try {
      const whereConditions: any = {
        timestamp: {
          gte: dateFrom,
          lte: dateTo
        },
        entityType: 'PAUSE_EVENT'
      };

      if (agentId) {
        whereConditions.entityId = agentId;
      }

      // Get pause event audit trail
      const auditTrail = await prisma.auditLog.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' }
      });

      // Get compliance violations
      const violations = await prisma.securityEvent.findMany({
        where: {
          type: 'COMPLIANCE_VIOLATION',
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          },
          ...(agentId && { 
            body: {
              contains: `"agentId":"${agentId}"`
            }
          })
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get actual pause events for comparison
      const pauseEventWhere: any = {
        startTime: {
          gte: dateFrom,
          lte: dateTo
        }
      };

      if (agentId) {
        pauseEventWhere.agentId = agentId;
      }

      const pauseEvents = await prisma.agentPauseEvent.findMany({
        where: pauseEventWhere,
        include: {
          agent: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { startTime: 'desc' }
      });

      // Calculate compliance metrics
      const complianceMetrics = {
        totalPauseEvents: pauseEvents.length,
        totalAuditEntries: auditTrail.length,
        totalViolations: violations.length,
        auditCoverage: pauseEvents.length > 0 ? (auditTrail.length / pauseEvents.length * 100).toFixed(2) : 0,
        complianceScore: violations.length === 0 ? 100 : Math.max(0, 100 - (violations.length / pauseEvents.length * 100))
      };

      return {
        pauseEvents,
        auditTrail,
        complianceMetrics,
        violations
      };

    } catch (error) {
      console.error('❌ Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }
}