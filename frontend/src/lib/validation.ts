import { z } from 'zod';

// Base validation schemas
export const emailSchema = z.string().email('Invalid email format').min(1, 'Email is required');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')
  .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/, 'Password must contain at least one special character');

export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
);

export const urlSchema = z.string().url('Invalid URL format');

// Common validation patterns
export const idSchema = z.string().min(1, 'ID is required');
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name is too long');
export const descriptionSchema = z.string().max(1000, 'Description is too long').optional();

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username is too long'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional()
});

// User management schemas
export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  preferences: z.record(z.any()).optional(),
  status: z.enum(['available', 'busy', 'away', 'offline']).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Contact management schemas
export const contactSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  company: z.string().max(100, 'Company name is too long').optional(),
  address: z.string().max(200, 'Address is too long').optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional()
});

export const contactUpdateSchema = contactSchema.partial();

// Campaign management schemas
export const campaignSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  type: z.enum(['outbound', 'inbound', 'blended']),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dialRatio: z.number().min(0.1).max(10).optional(),
  maxAttempts: z.number().min(1).max(10).optional(),
  retryDelay: z.number().min(0).max(1440).optional(), // minutes
  workingHours: z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    timezone: z.string()
  }).optional(),
  configuration: z.record(z.any()).optional()
});

export const campaignUpdateSchema = campaignSchema.partial();

// Integration management schemas
export const integrationSchema = z.object({
  name: nameSchema,
  type: z.enum(['CRM', 'EMAIL', 'SMS', 'WEBHOOK', 'API']),
  description: descriptionSchema,
  provider: z.string().min(1, 'Provider is required'),
  configuration: z.record(z.any()),
  credentials: z.record(z.any()).optional()
});

export const webhookSchema = z.object({
  name: nameSchema,
  url: urlSchema,
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  integrationId: idSchema.optional(),
  retryPolicy: z.object({
    maxAttempts: z.number().min(1).max(10).optional(),
    backoffMultiplier: z.number().min(1).max(5).optional(),
    initialDelay: z.number().min(100).max(60000).optional() // milliseconds
  }).optional(),
  headers: z.record(z.string()).optional()
});

// Recording and transcription schemas
export const recordingSchema = z.object({
  callRecordId: idSchema,
  fileName: z.string().min(1, 'File name is required'),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  format: z.enum(['wav', 'mp3', 'm4a']).optional()
});

export const transcriptionRequestSchema = z.object({
  recordingId: idSchema,
  provider: z.enum(['openai', 'google', 'aws', 'azure']).optional(),
  language: z.string().length(2, 'Language code must be 2 characters').optional()
});

// Notification schemas
export const notificationSchema = z.object({
  userId: z.number().positive(),
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  message: z.string().min(1, 'Message is required').max(500, 'Message is too long'),
  type: z.enum(['info', 'warning', 'error', 'success']).optional(),
  category: z.enum(['system', 'campaign', 'call', 'task']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  actionUrl: urlSchema.optional(),
  actionLabel: z.string().max(50, 'Action label is too long').optional(),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional()
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional()
});

// Generic validation function
export function validateData<T>(schema: z.ZodSchema<T>, data: any): {
  isValid: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validatedData = schema.parse(data);
    return {
      isValid: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      isValid: false,
      errors: ['Unknown validation error']
    };
  }
}

// Sanitization functions
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/\0/g, ''); // Remove null bytes
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

// SQL injection prevention
export function escapeSqlString(input: string): string {
  return input.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Validation middleware factory
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: any) => validateData(schema, data);
}