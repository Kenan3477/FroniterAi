// Unified authentication types for the application

export interface BaseUser {
  userId: string;
  username: string; 
  role: string;
  permissions: string[];
}

export interface OrganizationUser extends BaseUser {
  id: number;
  /** Set from DB after login; used by some routes (e.g. IP whitelist addedBy). */
  email?: string;
  organizationId: string | null;
  organization?: {
    id: string;
    name: string;
    displayName: string;
  } | null;
  organizationRole?: string;
  isActive: boolean;
}

// Extend Express Request interface with unified user type
declare global {
  namespace Express {
    interface Request {
      user?: OrganizationUser;
      organizationId?: string;
      organization?: {
        id: string;
        name: string;
        displayName: string;
      };
    }
  }
}

export default {};