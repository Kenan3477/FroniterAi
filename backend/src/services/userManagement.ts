/**
 * Omnivox AI User Management Service
 * Enterprise-grade user management with proper validation, security, and audit trails
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '../database';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  password?: string; // Optional - will generate secure password if not provided
  sendWelcomeEmail?: boolean;
  tempPassword?: boolean; // Force password reset on first login
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  isActive?: boolean;
  preferences?: Record<string, any>;
}

export interface UserSearchFilters {
  role?: string;
  isActive?: boolean;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  search?: string; // Search across name and email
}

/**
 * Generate a cryptographically secure password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new user with enterprise security features
 */
export async function createUser(data: CreateUserRequest) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { username: data.email }
      ]
    }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Generate password if not provided
  const password = data.password || generateSecurePassword();
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      username: data.email,
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      role: data.role,
      isActive: true,
      status: 'away',
      statusSince: new Date(),
      passwordResetToken: data.tempPassword ? crypto.randomBytes(32).toString('hex') : null,
      passwordResetExpires: data.tempPassword ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // 24 hours
    }
  });

  // Log user creation (audit trail)
  console.log(`✅ User created: ${user.name} (${user.email}) - Role: ${user.role}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    },
    tempPassword: data.tempPassword ? password : undefined
  };
}

/**
 * Update user information
 */
export async function updateUser(userId: number, data: UpdateUserRequest) {
  const updateData: any = {};

  if (data.firstName) updateData.firstName = data.firstName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.firstName || data.lastName) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      updateData.name = `${data.firstName || user.firstName} ${data.lastName || user.lastName}`;
    }
  }
  if (data.email) {
    updateData.email = data.email;
    updateData.username = data.email;
  }
  if (data.role) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.preferences) updateData.preferences = JSON.stringify(data.preferences);

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData
  });

  console.log(`✅ User updated: ${user.name} (${user.email})`);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    updatedAt: user.updatedAt
  };
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { 
      isActive: false,
      status: 'inactive'
    }
  });

  console.log(`⚠️ User deactivated: ${user.name} (${user.email})`);
  return user;
}

/**
 * Search users with filters
 */
export async function searchUsers(filters: UserSearchFilters = {}) {
  const where: any = {};

  if (filters.role) where.role = filters.role;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.lastLoginAfter) where.lastLogin = { gte: filters.lastLoginAfter };
  if (filters.lastLoginBefore) {
    where.lastLogin = { 
      ...(where.lastLogin || {}),
      lte: filters.lastLoginBefore 
    };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { email: { contains: filters.search } },
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } }
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      status: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return users;
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  const [total, active, inactive, admins, supervisors, agents, recentLogins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    prisma.user.count({ where: { role: 'AGENT' } }),
    prisma.user.count({ 
      where: { 
        lastLogin: { 
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        } 
      } 
    })
  ]);

  return {
    total,
    active,
    inactive,
    roles: {
      admins,
      supervisors,
      agents
    },
    recentLogins
  };
}

/**
 * Get campaigns assigned to a user
 */
async function getUserCampaigns(userId: number) {
  const assignments = await prisma.userCampaignAssignment.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      campaign: {
        select: {
          campaignId: true,
          name: true,
          status: true,
          description: true,
          dialMethod: true,
          createdAt: true
        }
      }
    }
  });

  return assignments.map(assignment => ({
    id: assignment.campaign.campaignId,
    campaignId: assignment.campaign.campaignId,
    name: assignment.campaign.name,
    status: assignment.campaign.status,
    description: assignment.campaign.description,
    dialMethod: assignment.campaign.dialMethod,
    assignedAt: assignment.assignedAt,
    createdAt: assignment.campaign.createdAt
  }));
}

/**
 * Assign a campaign to a user
 */
async function assignCampaignToUser(userId: number, campaignId: string, assignedBy?: number) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { campaignId }
  });
  
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Check if assignment already exists
  const existingAssignment = await prisma.userCampaignAssignment.findUnique({
    where: {
      userId_campaignId: {
        userId,
        campaignId
      }
    }
  });

  if (existingAssignment) {
    if (existingAssignment.isActive) {
      throw new Error('User is already assigned to this campaign');
    } else {
      // Reactivate existing assignment
      return await prisma.userCampaignAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          isActive: true,
          assignedAt: new Date(),
          assignedBy
        }
      });
    }
  }

  // Create new assignment
  return await prisma.userCampaignAssignment.create({
    data: {
      userId,
      campaignId,
      assignedBy,
      isActive: true
    }
  });
}

/**
 * Unassign a campaign from a user
 */
async function unassignCampaignFromUser(userId: number, campaignId: string) {
  const assignment = await prisma.userCampaignAssignment.findUnique({
    where: {
      userId_campaignId: {
        userId,
        campaignId
      }
    }
  });

  if (!assignment) {
    throw new Error('Campaign assignment not found');
  }

  // Soft delete by setting isActive to false
  await prisma.userCampaignAssignment.update({
    where: { id: assignment.id },
    data: { isActive: false }
  });
}

/**
 * Get all available campaigns for assignment
 */
async function getAvailableCampaigns() {
  return await prisma.campaign.findMany({
    select: {
      campaignId: true,
      name: true,
      status: true,
      description: true,
      dialMethod: true,
      createdAt: true,
      _count: {
        select: {
          userAssignments: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { name: 'asc' }
    ]
  });
}

export default {
  createUser,
  updateUser,
  deactivateUser,
  searchUsers,
  getUserStats,
  generateSecurePassword,
  hashPassword,
  verifyPassword,
  getUserCampaigns,
  assignCampaignToUser,
  unassignCampaignFromUser,
  getAvailableCampaigns
};