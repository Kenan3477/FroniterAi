// Role-based access control for pause events and agent data
import { prisma } from '../database';

export enum UserRole {
  AGENT = 'AGENT',
  SUPERVISOR = 'SUPERVISOR', 
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM'
}

export enum AccessLevel {
  NONE = 'NONE',
  OWN = 'OWN',       // Can only access own data
  TEAM = 'TEAM',     // Can access team members' data
  ALL = 'ALL'        // Can access all agent data
}

export enum DataType {
  PAUSE_EVENTS = 'PAUSE_EVENTS',
  PAUSE_STATS = 'PAUSE_STATS', 
  PAUSE_REPORTS = 'PAUSE_REPORTS',
  AGENT_PRODUCTIVITY = 'AGENT_PRODUCTIVITY',
  COMPLIANCE_DATA = 'COMPLIANCE_DATA'
}

interface AccessRequest {
  userId: string;
  userRole: UserRole;
  targetAgentId?: string;
  dataType: DataType;
  action: 'READ' | 'write' | 'delete';
  context?: {
    reportType?: string;
    dateRange?: { from: Date; to: Date };
    teamId?: string;
  };
}

interface AccessResult {
  allowed: boolean;
  accessLevel: AccessLevel;
  filteredData?: any;
  restrictions?: string[];
  auditRequired?: boolean;
  reason?: string;
}

export class PauseEventAccessControl {

  /**
   * Check if user has permission to access pause event data
   */
  static async checkAccess(request: AccessRequest): Promise<AccessResult> {
    try {
      // Get user details and role
      const user = await prisma.user.findUnique({
        where: { id: parseInt(request.userId) },
        select: {
          id: true,
          role: true,
          email: true,
          firstName: true,
          lastName: true
          // TODO: Add teamId when team model is implemented
        }
      });

      if (!user) {
        return {
          allowed: false,
          accessLevel: AccessLevel.NONE,
          reason: 'User not found'
        };
      }

      // Define role-based access permissions
      const permissions = this.getRolePermissions(user.role as UserRole);
      const dataTypeAccess = permissions[request.dataType];

      if (!dataTypeAccess) {
        return {
          allowed: false,
          accessLevel: AccessLevel.NONE,
          reason: `Role ${user.role} does not have access to ${request.dataType}`,
          auditRequired: true
        };
      }

      // Check action permissions
      if (!dataTypeAccess.actions.includes(request.action)) {
        return {
          allowed: false,
          accessLevel: AccessLevel.NONE,
          reason: `Role ${user.role} cannot perform ${request.action} on ${request.dataType}`,
          auditRequired: true
        };
      }

      // Determine access level based on role and target
      const accessLevel = this.determineAccessLevel(
        user.role as UserRole,
        request.targetAgentId,
        request.userId
      );

      // Additional restrictions based on data sensitivity
      const restrictions = this.getDataRestrictions(
        user.role as UserRole,
        request.dataType,
        accessLevel
      );

      return {
        allowed: true,
        accessLevel,
        restrictions,
        auditRequired: this.requiresAudit(user.role as UserRole, request.dataType, accessLevel)
      };

    } catch (error) {
      console.error('❌ Access control check failed:', error);
      return {
        allowed: false,
        accessLevel: AccessLevel.NONE,
        reason: 'Access control system error',
        auditRequired: true
      };
    }
  }

  /**
   * Apply access filters to pause event query
   */
  static applyAccessFilters(
    accessResult: AccessResult,
    userId: string,
    baseQuery: any
  ): any {
    if (!accessResult.allowed) {
      // Return empty result set
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          id: 'access_denied' // This will return no results
        }
      };
    }

    switch (accessResult.accessLevel) {
      case AccessLevel.OWN:
        return {
          ...baseQuery,
          where: {
            ...baseQuery.where,
            agentId: userId
          }
        };

      case AccessLevel.TEAM:
        // TODO: Implement team-based filtering when team model is ready
        // For now, fall back to admin-level access for supervisors
        return baseQuery;

      case AccessLevel.ALL:
        return baseQuery;

      default:
        return {
          ...baseQuery,
          where: {
            ...baseQuery.where,
            id: 'no_access'
          }
        };
    }
  }

  /**
   * Filter sensitive fields from pause event data based on access level
   */
  static filterSensitiveData(
    data: any[],
    accessResult: AccessResult,
    userId: string
  ): any[] {
    if (!accessResult.allowed) {
      return [];
    }

    return data.map(item => {
      const filtered = { ...item };

      // Apply restrictions based on access level
      if (accessResult.restrictions?.includes('HIDE_PERSONAL_COMMENTS')) {
        if (item.agentId !== userId) {
          filtered.agentComment = '[REDACTED]';
        }
      }

      if (accessResult.restrictions?.includes('HIDE_SENSITIVE_METADATA')) {
        if (item.agentId !== userId && item.metadata) {
          filtered.metadata = { restricted: true };
        }
      }

      if (accessResult.restrictions?.includes('AGGREGATE_ONLY')) {
        // For aggregate-only access, remove individual event details
        delete filtered.agentComment;
        delete filtered.metadata;
      }

      return filtered;
    });
  }

  /**
   * Get role-based permissions configuration
   */
  private static getRolePermissions(role: UserRole): Record<DataType, { actions: string[], restrictions: string[] }> {
    const permissions = {
      [UserRole.AGENT]: {
        [DataType.PAUSE_EVENTS]: { 
          actions: ['read'], 
          restrictions: ['OWN_DATA_ONLY'] 
        },
        [DataType.PAUSE_STATS]: { 
          actions: ['read'], 
          restrictions: ['OWN_DATA_ONLY'] 
        },
        [DataType.PAUSE_REPORTS]: { 
          actions: [], 
          restrictions: ['NO_ACCESS'] 
        },
        [DataType.AGENT_PRODUCTIVITY]: { 
          actions: ['read'], 
          restrictions: ['OWN_DATA_ONLY', 'BASIC_METRICS_ONLY'] 
        },
        [DataType.COMPLIANCE_DATA]: { 
          actions: [], 
          restrictions: ['NO_ACCESS'] 
        }
      },
      [UserRole.SUPERVISOR]: {
        [DataType.PAUSE_EVENTS]: { 
          actions: ['read'], 
          restrictions: ['TEAM_DATA_ONLY', 'HIDE_PERSONAL_COMMENTS'] 
        },
        [DataType.PAUSE_STATS]: { 
          actions: ['read'], 
          restrictions: ['TEAM_DATA_ONLY'] 
        },
        [DataType.PAUSE_REPORTS]: { 
          actions: ['read'], 
          restrictions: ['TEAM_DATA_ONLY'] 
        },
        [DataType.AGENT_PRODUCTIVITY]: { 
          actions: ['read'], 
          restrictions: ['TEAM_DATA_ONLY'] 
        },
        [DataType.COMPLIANCE_DATA]: { 
          actions: ['read'], 
          restrictions: ['AGGREGATE_ONLY'] 
        }
      },
      [UserRole.ADMIN]: {
        [DataType.PAUSE_EVENTS]: { 
          actions: ['read', 'write', 'delete'], 
          restrictions: [] 
        },
        [DataType.PAUSE_STATS]: { 
          actions: ['read'], 
          restrictions: [] 
        },
        [DataType.PAUSE_REPORTS]: { 
          actions: ['read'], 
          restrictions: [] 
        },
        [DataType.AGENT_PRODUCTIVITY]: { 
          actions: ['read'], 
          restrictions: [] 
        },
        [DataType.COMPLIANCE_DATA]: { 
          actions: ['read'], 
          restrictions: [] 
        }
      },
      [UserRole.SYSTEM]: {
        [DataType.PAUSE_EVENTS]: { 
          actions: ['read', 'write', 'delete'], 
          restrictions: [] 
        },
        [DataType.PAUSE_STATS]: { 
          actions: ['read'], 
          restrictions: [] 
        },
        [DataType.PAUSE_REPORTS]: { 
          actions: ['read'], 
          restrictions: [] 
        },
        [DataType.AGENT_PRODUCTIVITY]: { 
          actions: ['read'], 
          restrictions: [] 
        },
        [DataType.COMPLIANCE_DATA]: { 
          actions: ['read'], 
          restrictions: [] 
        }
      }
    };

    return permissions[role] || {};
  }

  /**
   * Determine access level based on role and target
   */
  private static determineAccessLevel(
    userRole: UserRole,
    targetAgentId?: string,
    userId?: string
  ): AccessLevel {
    switch (userRole) {
      case UserRole.AGENT:
        return AccessLevel.OWN;
      
      case UserRole.SUPERVISOR:
        // TODO: Implement team-based access when team model is ready
        // For now, supervisors get full access
        return AccessLevel.ALL;
      
      case UserRole.ADMIN:
      case UserRole.SYSTEM:
        return AccessLevel.ALL;
      
      default:
        return AccessLevel.NONE;
    }
  }

  /**
   * Get data restrictions based on role and access level
   */
  private static getDataRestrictions(
    role: UserRole,
    dataType: DataType,
    accessLevel: AccessLevel
  ): string[] {
    const restrictions: string[] = [];

    if (role === UserRole.AGENT && accessLevel === AccessLevel.OWN) {
      restrictions.push('OWN_DATA_ONLY');
    }

    if (role === UserRole.SUPERVISOR) {
      restrictions.push('HIDE_SENSITIVE_METADATA');
      if (dataType === DataType.PAUSE_EVENTS) {
        restrictions.push('HIDE_PERSONAL_COMMENTS');
      }
    }

    if (dataType === DataType.COMPLIANCE_DATA && role !== UserRole.ADMIN) {
      restrictions.push('AGGREGATE_ONLY');
    }

    return restrictions;
  }

  /**
   * Check if audit logging is required for this access
   */
  private static requiresAudit(
    role: UserRole,
    dataType: DataType,
    accessLevel: AccessLevel
  ): boolean {
    // Always audit admin and system access
    if (role === UserRole.ADMIN || role === UserRole.SYSTEM) {
      return true;
    }

    // Audit supervisor access to individual agent data
    if (role === UserRole.SUPERVISOR && accessLevel === AccessLevel.ALL) {
      return true;
    }

    // Audit any access to compliance data
    if (dataType === DataType.COMPLIANCE_DATA) {
      return true;
    }

    // Audit access to pause events (sensitive HR data)
    if (dataType === DataType.PAUSE_EVENTS) {
      return true;
    }

    return false;
  }

  /**
   * Validate agent ID exists and user has access to it
   */
  static async validateAgentAccess(
    agentId: string,
    userId: string,
    userRole: UserRole
  ): Promise<{ valid: boolean; agentName?: string; reason?: string }> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { agentId },
        select: {
          agentId: true,
          firstName: true,
          lastName: true,
          email: true
          // TODO: Add teamId when team model is ready
        }
      });

      if (!agent) {
        return {
          valid: false,
          reason: 'Agent not found'
        };
      }

      // Check access based on role
      if (userRole === UserRole.AGENT && agentId !== userId) {
        return {
          valid: false,
          reason: 'Agents can only access their own data'
        };
      }

      // TODO: Add team-based validation for supervisors
      // if (userRole === UserRole.SUPERVISOR && agent.teamId !== user.teamId) {
      //   return { valid: false, reason: 'Supervisors can only access team members data' };
      // }

      return {
        valid: true,
        agentName: `${agent.firstName} ${agent.lastName}`
      };

    } catch (error) {
      console.error('❌ Agent access validation failed:', error);
      return {
        valid: false,
        reason: 'System error during validation'
      };
    }
  }
}