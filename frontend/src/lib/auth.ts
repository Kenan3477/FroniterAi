import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Environment configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT utilities
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  tokenVersion?: number;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'kennex-system',
    audience: 'kennex-users'
  });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'kennex-system',
    audience: 'kennex-users'
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
};

// Security constants
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
export const PASSWORD_RESET_EXPIRES = 60 * 60 * 1000; // 1 hour in milliseconds

// Role definitions
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  AGENT = 'AGENT'
}

export const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'campaigns:create', 'campaigns:read', 'campaigns:update', 'campaigns:delete',
    'reports:read', 'reports:export',
    'system:admin', 'system:config'
  ],
  [UserRole.SUPERVISOR]: [
    'users:read', 'users:update',
    'campaigns:create', 'campaigns:read', 'campaigns:update',
    'reports:read', 'reports:export',
    'agents:manage'
  ],
  [UserRole.AGENT]: [
    'campaigns:read',
    'contacts:read', 'contacts:update',
    'calls:make', 'calls:receive'
  ]
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Cookie settings
export const COOKIE_SETTINGS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
  path: '/'
};