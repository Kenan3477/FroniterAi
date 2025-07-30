// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Analyzed by Evolution System at 2025-07-28 21:11:06.482872
// Analyzed by Evolution System at 2025-07-28 20:53:32.824929
// Analyzed by Evolution System at 2025-07-28 20:52:32.638130
// Analyzed by Evolution System at 2025-07-28 20:49:02.039661
// Analyzed by Evolution System at 2025-07-28 20:16:55.907597
// Analyzed by Evolution System at 2025-07-28 20:15:55.671717
// Analyzed by Evolution System at 2025-07-28 20:08:53.753665
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: string;
  subscriptionTier: 'basic' | 'professional' | 'enterprise';
  permissions: string[];
  preferences: Record<string, any>;
  createdAt: string;
  lastLoginAt?: string;
}

export interface BusinessMetrics {
  revenue: number;
  growth: number;
  customers: number;
  retention: number;
  satisfaction: number;
  efficiency: number;
}

export interface AnalyticsData {
  period: string;
  metrics: BusinessMetrics;
  trends: Record<string, number>;
  insights: string[];
  recommendations: string[];
}

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  progress: number;
  team: string[];
  deadline?: string;
  budget: number;
  spent: number;
  milestones: any[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, any>;
  permissions: string[];
  enabled: boolean;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('frontier_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('frontier_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.api.post<ApiResponse<{ user: User; token: string }>>('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data.data;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    company?: string;
  }): Promise<{ user: User; token: string }> {
    const response = await this.api.post<ApiResponse<{ user: User; token: string }>>('/api/v1/auth/register', userData);
    return response.data.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/api/v1/auth/logout');
    localStorage.removeItem('frontier_token');
  }

  async refreshToken(): Promise<string> {
    const response = await this.api.post<ApiResponse<{ token: string }>>('/api/v1/auth/refresh');
    return response.data.data.token;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.api.post('/api/v1/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.api.post('/api/v1/auth/reset-password', { token, password });
  }

  // User Management
  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<ApiResponse<User>>('/api/v1/user/profile');
    return response.data.data;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await this.api.patch<ApiResponse<User>>('/api/v1/user/profile', updates);
    return response.data.data;
  }

  async updatePreferences(preferences: Record<string, any>): Promise<void> {
    await this.api.patch('/api/v1/user/preferences', { preferences });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.api.post('/api/v1/user/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Business Analytics
  async getDashboardMetrics(timeframe: string = '30d'): Promise<AnalyticsData> {
    const response = await this.api.get<ApiResponse<AnalyticsData>>('/api/v1/analytics/dashboard', {
      params: { timeframe },
    });
    return response.data.data;
  }

  async getBusinessInsights(category?: string): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/api/v1/analytics/insights', {
      params: { category },
    });
    return response.data.data;
  }

  async getPerformanceMetrics(metricType: string, timeframe: string): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>(`/api/v1/analytics/metrics/${metricType}`, {
      params: { timeframe },
    });
    return response.data.data;
  }

  async exportAnalytics(format: 'csv' | 'xlsx' | 'pdf', timeframe: string): Promise<Blob> {
    const response = await this.api.get('/api/v1/analytics/export', {
      params: { format, timeframe },
      responseType: 'blob',
    });
    return response.data;
  }

  // Project Management
  async getProjects(status?: string): Promise<ProjectData[]> {
    const response = await this.api.get<ApiResponse<ProjectData[]>>('/api/v1/projects', {
      params: { status },
    });
    return response.data.data;
  }

  async getProject(projectId: string): Promise<ProjectData> {
    const response = await this.api.get<ApiResponse<ProjectData>>(`/api/v1/projects/${projectId}`);
    return response.data.data;
  }

  async createProject(projectData: Omit<ProjectData, 'id'>): Promise<ProjectData> {
    const response = await this.api.post<ApiResponse<ProjectData>>('/api/v1/projects', projectData);
    return response.data.data;
  }

  async updateProject(projectId: string, updates: Partial<ProjectData>): Promise<ProjectData> {
    const response = await this.api.patch<ApiResponse<ProjectData>>(`/api/v1/projects/${projectId}`, updates);
    return response.data.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.api.delete(`/api/v1/projects/${projectId}`);
  }

  // Tools and Integrations
  async getAvailableTools(): Promise<ToolDefinition[]> {
    const response = await this.api.get<ApiResponse<ToolDefinition[]>>('/api/v1/tools');
    return response.data.data;
  }

  async getToolDetails(toolName: string): Promise<ToolDefinition> {
    const response = await this.api.get<ApiResponse<ToolDefinition>>(`/api/v1/tools/${toolName}`);
    return response.data.data;
  }

  async enableTool(toolName: string): Promise<void> {
    await this.api.post(`/api/v1/tools/${toolName}/enable`);
  }

  async disableTool(toolName: string): Promise<void> {
    await this.api.post(`/api/v1/tools/${toolName}/disable`);
  }

  async configureTool(toolName: string, config: Record<string, any>): Promise<void> {
    await this.api.patch(`/api/v1/tools/${toolName}/config`, config);
  }

  // Data Management
  async uploadFile(file: File, category?: string): Promise<{ fileId: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);

    const response = await this.api.post<ApiResponse<{ fileId: string; url: string }>>(
      '/api/v1/files/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.data;
  }

  async getFiles(category?: string): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/api/v1/files', {
      params: { category },
    });
    return response.data.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.api.delete(`/api/v1/files/${fileId}`);
  }

  // Notifications
  async getNotifications(unreadOnly: boolean = false): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/api/v1/notifications', {
      params: { unreadOnly },
    });
    return response.data.data;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.api.patch(`/api/v1/notifications/${notificationId}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.api.patch('/api/v1/notifications/read-all');
  }

  // Subscription and Billing
  async getSubscriptionInfo(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/api/v1/subscription');
    return response.data.data;
  }

  async upgradeSubscription(plan: string): Promise<any> {
    const response = await this.api.post<ApiResponse<any>>('/api/v1/subscription/upgrade', { plan });
    return response.data.data;
  }

  async getBillingHistory(): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/api/v1/billing/history');
    return response.data.data;
  }

  async updateBillingInfo(billingData: any): Promise<void> {
    await this.api.patch('/api/v1/billing/info', billingData);
  }

  // Support and Feedback
  async submitFeedback(feedback: {
    type: 'bug' | 'feature' | 'improvement' | 'general';
    subject: string;
    description: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<void> {
    await this.api.post('/api/v1/support/feedback', feedback);
  }

  async getSupportTickets(): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/api/v1/support/tickets');
    return response.data.data;
  }

  async createSupportTicket(ticket: {
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
  }): Promise<any> {
    const response = await this.api.post<ApiResponse<any>>('/api/v1/support/tickets', ticket);
    return response.data.data;
  }

  // Generic API call method
  async call<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.api.request<ApiResponse<T>>({
      method,
      url: endpoint,
      data,
      ...config,
    });
    return response.data.data;
  }
}

export const apiService = new ApiService();