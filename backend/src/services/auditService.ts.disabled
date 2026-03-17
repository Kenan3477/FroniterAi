import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  performedByUserId: string;
  performedByUserEmail: string;
  performedByUserName: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export class AuditService {
  /**
   * Create an audit log entry for compliance tracking
   */
  static async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          performedByUserId: data.performedByUserId,
          performedByUserEmail: data.performedByUserEmail,
          performedByUserName: data.performedByUserName,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sessionId: data.sessionId,
          previousValues: data.previousValues ? JSON.stringify(data.previousValues) : null,
          newValues: data.newValues ? JSON.stringify(data.newValues) : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          severity: data.severity || 'INFO',
        },
      });
      
      console.log(`[AUDIT] ${data.action} performed by ${data.performedByUserEmail} on ${data.entityType} ${data.entityId || ''}`);
    } catch (error) {
      console.error('[AUDIT ERROR] Failed to create audit log:', error);
      // Don't throw - audit logging failure should not break the main operation
    }
  }

  /**
   * Log user creation audit event
   */
  static async logUserCreation(
    createdUser: { id: string; name: string; email: string; role: string },
    performedBy: { id: string; email: string; name: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: createdUser.id,
      performedByUserId: performedBy.id,
      performedByUserEmail: performedBy.email,
      performedByUserName: performedBy.name,
      ipAddress,
      userAgent,
      newValues: {
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
      severity: 'INFO',
    });
  }

  /**
   * Log email verification events
   */
  static async logEmailVerification(
    userId: string,
    email: string,
    action: 'VERIFICATION_SENT' | 'VERIFICATION_COMPLETED' | 'VERIFICATION_FAILED',
    performedBy: { id: string; email: string; name: string },
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.createAuditLog({
      action,
      entityType: 'EmailVerification',
      entityId: userId,
      performedByUserId: performedBy.id,
      performedByUserEmail: performedBy.email,
      performedByUserName: performedBy.name,
      ipAddress,
      metadata: {
        targetEmail: email,
        ...metadata,
      },
      severity: action === 'VERIFICATION_FAILED' ? 'WARNING' : 'INFO',
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getAuditLogs(entityType?: string, entityId?: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}