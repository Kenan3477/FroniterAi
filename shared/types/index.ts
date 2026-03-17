// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  status: UserStatus;
  organizationId: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'super_admin' | 'org_admin' | 'supervisor' | 'agent' | 'user';
export type UserStatus = 'available' | 'away' | 'busy' | 'offline';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  domains: string[];
  tags: string[];
  status: 'active' | 'inactive' | 'suspended';
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  allowedDomains: string[];
  ssoEnabled: boolean;
  apiAccess: boolean;
  maxUsers: number;
  features: string[];
  billingPlan: 'free' | 'pro' | 'enterprise';
}

// Contact Types
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  tags: string[];
  source: ContactSource;
  status: ContactStatus;
  lastContact?: Date;
  assignedTo?: string;
  organizationId: string;
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactSource = 'manual' | 'import' | 'api' | 'campaign' | 'website';
export type ContactStatus = 'active' | 'inactive' | 'dnc' | 'bounced' | 'qualified';

// Interaction Types
export interface Interaction {
  id: string;
  contactId: string;
  userId: string;
  organizationId: string;
  type: InteractionType;
  channel: InteractionChannel;
  direction: 'inbound' | 'outbound';
  status: InteractionStatus;
  priority: 'low' | 'medium' | 'high';
  subject?: string;
  content?: string;
  duration?: number;
  outcome?: InteractionOutcome;
  notes?: string;
  tags: string[];
  metadata: Record<string, any>;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InteractionType = 'call' | 'email' | 'sms' | 'chat' | 'whatsapp' | 'social' | 'meeting';
export type InteractionChannel = 'voice' | 'email' | 'sms' | 'whatsapp' | 'messenger' | 'instagram' | 'livechat' | 'website';
export type InteractionStatus = 'new' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
export type InteractionOutcome = 'positive' | 'neutral' | 'negative' | 'callback' | 'voicemail' | 'busy' | 'no-answer';

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  organizationId: string;
  createdBy: string;
  contactLists: string[];
  workflow?: WorkflowDefinition;
  schedule: CampaignSchedule;
  settings: CampaignSettings;
  analytics: CampaignAnalytics;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export type CampaignType = 'outbound_calls' | 'email_sequence' | 'sms_blast' | 'mixed_channel';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface CampaignSchedule {
  timezone: string;
  workingHours: TimeSlot[];
  blackoutDates: Date[];
  dialingRate: number;
  maxConcurrent: number;
  retryAttempts: number;
  retryInterval: string;
}

export interface CampaignSettings {
  dialerMode: 'manual' | 'progressive' | 'predictive' | 'preview';
  recordCalls: boolean;
  requireDisposition: boolean;
  enableAI: boolean;
  voicemailAction: 'skip' | 'leave_message' | 'detect_beep';
}

export interface CampaignAnalytics {
  totalContacts: number;
  contacted: number;
  connected: number;
  converted: number;
  conversionRate: number;
  averageDuration: number;
  costPerLead: number;
}

// Call and Dialer Types
export interface Call {
  id: string;
  contactId: string;
  userId: string;
  campaignId?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: CallStatus;
  outcome?: CallOutcome;
  startTime: Date;
  endTime?: Date;
  duration: number;
  recording?: CallRecording;
  transcript?: string;
  notes?: string;
  cost?: number;
  metadata: Record<string, any>;
}

export type CallStatus = 'connecting' | 'ringing' | 'connected' | 'on-hold' | 'ended' | 'failed';
export type CallOutcome = 'connected' | 'voicemail' | 'busy' | 'no-answer' | 'disconnected' | 'failed';

export interface CallRecording {
  id: string;
  url: string;
  duration: number;
  fileSize: number;
  format: string;
  quality: 'low' | 'medium' | 'high';
}

// Workflow Types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  defaultValue?: any;
  description?: string;
}

export interface WorkflowSettings {
  timeout: number;
  retryAttempts: number;
  errorHandling: 'stop' | 'continue' | 'retry';
  logging: boolean;
}

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'data' | 'flow';
  required: boolean;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export type WorkflowNodeType = 
  | 'start' 
  | 'ai_agent' 
  | 'query' 
  | 'http_request' 
  | 'decision' 
  | 'action' 
  | 'end';

export interface WorkflowNodeData {
  label: string;
  config: Record<string, any>;
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

// Utility Types
export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  days: number[];    // 0-6 (Sunday-Saturday)
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}