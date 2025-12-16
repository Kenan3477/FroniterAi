import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Local type definitions (avoiding shared types import issues)
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  status: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
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

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  id: string;
  type: string;
  status: string;
  contactId: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

// Flow types (specific to Kennex Flows)
export interface Flow {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  latestVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowVersion {
  id: string;
  flowId: string;
  version: number;
  status: 'DRAFT' | 'DEPLOYED';
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface NodeTypeDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  configSchema: any;
  inputPorts: any[];
  outputPorts: any[];
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('kennex_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          try {
            await this.refreshToken();
            // Retry the original request
            return this.client.request(error.config);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('kennex_token');
            localStorage.removeItem('kennex_refresh_token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<APIResponse<AuthResponse>>('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      localStorage.setItem('kennex_token', response.data.data.token);
      localStorage.setItem('kennex_refresh_token', response.data.data.refreshToken);
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Login failed');
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout');
    localStorage.removeItem('kennex_token');
    localStorage.removeItem('kennex_refresh_token');
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('kennex_refresh_token');
    const response = await this.client.post<APIResponse<AuthResponse>>('/api/auth/refresh', {
      refreshToken,
    });
    
    if (response.data.success && response.data.data) {
      localStorage.setItem('kennex_token', response.data.data.token);
      return response.data.data;
    }
    
    throw new Error('Token refresh failed');
  }

  // Users
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<APIResponse<User>>('/api/users/me');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to get current user');
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await this.client.put<APIResponse<User>>(`/api/users/${userId}`, userData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to update user');
  }

  // Contacts
  async getContacts(params?: PaginationParams): Promise<PaginatedResponse<Contact>> {
    const response = await this.client.get<APIResponse<PaginatedResponse<Contact>>>('/api/contacts', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to get contacts');
  }

  async createContact(contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const response = await this.client.post<APIResponse<Contact>>('/api/contacts', contactData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to create contact');
  }

  async updateContact(contactId: string, contactData: Partial<Contact>): Promise<Contact> {
    const response = await this.client.put<APIResponse<Contact>>(`/api/contacts/${contactId}`, contactData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to update contact');
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.client.delete(`/api/contacts/${contactId}`);
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    const response = await this.client.get<APIResponse<Campaign[]>>('/api/campaigns');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to get campaigns');
  }

  async createCampaign(campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    const response = await this.client.post<APIResponse<Campaign>>('/api/campaigns', campaignData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to create campaign');
  }

  // Interactions
  async getInteractions(params?: PaginationParams): Promise<PaginatedResponse<Interaction>> {
    const response = await this.client.get<APIResponse<PaginatedResponse<Interaction>>>('/api/interactions', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to get interactions');
  }

  async createInteraction(interactionData: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Interaction> {
    const response = await this.client.post<APIResponse<Interaction>>('/api/interactions', interactionData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to create interaction');
  }

  // Analytics
  async getDashboardAnalytics(): Promise<any> {
    const response = await this.client.get<APIResponse<any>>('/api/analytics/dashboard');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to get dashboard analytics');
  }

  // Flows
  async getFlows(): Promise<Flow[]> {
    const response = await this.client.get('/api/flows');
    return response.data;
  }

  async createFlow(flowData: { name: string; description: string }): Promise<Flow> {
    const response = await this.client.post('/api/flows', flowData);
    return response.data;
  }

  async getFlow(flowId: string): Promise<Flow> {
    const response = await this.client.get(`/api/flows/${flowId}`);
    return response.data;
  }

  async updateFlow(flowId: string, data: { name?: string; description?: string; status?: string }): Promise<Flow> {
    const response = await this.client.put(`/api/flows/${flowId}`, data);
    return response.data.flow;
  }

  async deleteFlow(flowId: string): Promise<void> {
    try {
      await this.client.delete(`/api/flows/${flowId}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Flow not found');
      } else if (error.response?.status === 409) {
        throw new Error('Cannot delete flow: Flow is currently deployed and active');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to delete flow');
      }
    }
  }

  async getFlowVersion(flowId: string, version: number): Promise<FlowVersion> {
    const response = await this.client.get(`/api/flows/${flowId}/versions/${version}`);
    return response.data;
  }

  async getNodeTypes(): Promise<NodeTypeDefinition[]> {
    const response = await this.client.get('/api/flow-node-types');
    return response.data;
  }

  async createFlowNode(flowId: string, versionId: string, nodeData: Partial<FlowNode>): Promise<FlowNode> {
    const response = await this.client.post(`/api/flows/${flowId}/versions/${versionId}/nodes`, nodeData);
    return response.data;
  }

  async updateFlowNode(flowId: string, versionId: string, nodeId: string, nodeData: Partial<FlowNode>): Promise<FlowNode> {
    const response = await this.client.put(`/api/flows/${flowId}/versions/${versionId}/nodes/${nodeId}`, nodeData);
    return response.data;
  }

  async deleteFlowNode(flowId: string, versionId: string, nodeId: string): Promise<void> {
    await this.client.delete(`/api/flows/${flowId}/versions/${versionId}/nodes/${nodeId}`);
  }

  async createFlowEdge(flowId: string, versionId: string, edgeData: Partial<FlowEdge>): Promise<FlowEdge> {
    const response = await this.client.post(`/api/flows/${flowId}/versions/${versionId}/edges`, edgeData);
    return response.data;
  }

  async deleteFlowEdge(flowId: string, versionId: string, edgeId: string): Promise<void> {
    await this.client.delete(`/api/flows/${flowId}/versions/${versionId}/edges/${edgeId}`);
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export individual API modules for better organization
export const authAPI = {
  login: (credentials: LoginCredentials) => apiClient.login(credentials),
  logout: () => apiClient.logout(),
  refreshToken: () => apiClient.refreshToken(),
  getCurrentUser: () => apiClient.getCurrentUser(),
};

export const contactsAPI = {
  getContacts: (params?: PaginationParams) => apiClient.getContacts(params),
  createContact: (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => apiClient.createContact(data),
  updateContact: (id: string, data: Partial<Contact>) => apiClient.updateContact(id, data),
  deleteContact: (id: string) => apiClient.deleteContact(id),
};

export const campaignsAPI = {
  getCampaigns: () => apiClient.getCampaigns(),
  createCampaign: (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => apiClient.createCampaign(data),
};

export const interactionsAPI = {
  getInteractions: (params?: PaginationParams) => apiClient.getInteractions(params),
  createInteraction: (data: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>) => apiClient.createInteraction(data),
};

export const analyticsAPI = {
  getDashboardAnalytics: () => apiClient.getDashboardAnalytics(),
};

export const flowsAPI = {
  getFlows: () => apiClient.getFlows(),
  createFlow: (data: { name: string; description: string }) => apiClient.createFlow(data),
  getFlow: (id: string) => apiClient.getFlow(id),
  updateFlow: (id: string, data: { name?: string; description?: string; status?: string }) => apiClient.updateFlow(id, data),
  deleteFlow: (id: string) => apiClient.deleteFlow(id),
  getFlowVersion: (flowId: string, version: number) => apiClient.getFlowVersion(flowId, version),
  getNodeTypes: () => apiClient.getNodeTypes(),
  createFlowNode: (flowId: string, versionId: string, nodeData: Partial<FlowNode>) => 
    apiClient.createFlowNode(flowId, versionId, nodeData),
  updateFlowNode: (flowId: string, versionId: string, nodeId: string, nodeData: Partial<FlowNode>) => 
    apiClient.updateFlowNode(flowId, versionId, nodeId, nodeData),
  deleteFlowNode: (flowId: string, versionId: string, nodeId: string) => 
    apiClient.deleteFlowNode(flowId, versionId, nodeId),
  createFlowEdge: (flowId: string, versionId: string, edgeData: Partial<FlowEdge>) => 
    apiClient.createFlowEdge(flowId, versionId, edgeData),
  deleteFlowEdge: (flowId: string, versionId: string, edgeId: string) => 
    apiClient.deleteFlowEdge(flowId, versionId, edgeId),
};