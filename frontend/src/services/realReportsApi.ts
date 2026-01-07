/**
 * Real Reports API Service - Frontend service for report management
 * Replaces "NOT IMPLEMENTED" placeholders with functional reports
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://omnivox-backend-production.up.railway.app';

// Request/response interfaces
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'campaign' | 'agent' | 'outcome' | 'custom';
  fields: string[];
  filters: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'table';
  defaultDateRange: number;
}

export interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  filters: Record<string, any>;
  nextRun: Date;
  enabled: boolean;
  lastRun?: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table';
  title: string;
  data: any;
  refreshRate: number;
  size: 'small' | 'medium' | 'large';
}

export interface ReportData {
  id: string;
  title: string;
  generatedAt: Date;
  filters: Record<string, any>;
  data: any;
  charts?: any[];
  summary?: Record<string, any>;
}

export interface ReportBuilderConfig {
  dataSources: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  }>;
  chartTypes: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
  filters: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

/**
 * Real Reports API Service with database-driven functionality
 */
class RealReportsApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(): Promise<DashboardWidget[]> {
    try {
      console.log('📊 Fetching dashboard analytics');

      const response = await axios.get(
        `${API_URL}/api/reports/dashboard`,
        this.getAuthHeaders()
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch dashboard analytics');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error fetching dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(): Promise<ReportTemplate[]> {
    try {
      console.log('📋 Fetching report templates');

      const response = await axios.get(
        `${API_URL}/api/reports/templates`,
        this.getAuthHeaders()
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch report templates');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error fetching report templates:', error);
      throw error;
    }
  }

  /**
   * Generate report using template
   */
  async generateReport(templateId: string, filters?: Record<string, any>): Promise<ReportData> {
    try {
      console.log('🔄 Generating report:', templateId);

      const response = await axios.post(
        `${API_URL}/api/reports/generate`,
        { templateId, filters },
        this.getAuthHeaders()
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate report');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    try {
      console.log('📅 Fetching scheduled reports');

      const response = await axios.get(
        `${API_URL}/api/reports/scheduled`,
        this.getAuthHeaders()
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch scheduled reports');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error fetching scheduled reports:', error);
      throw error;
    }
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(reportData: Omit<ScheduledReport, 'id' | 'nextRun'>): Promise<ScheduledReport> {
    try {
      console.log('➕ Creating scheduled report:', reportData.name);

      const response = await axios.post(
        `${API_URL}/api/reports/scheduled`,
        reportData,
        this.getAuthHeaders()
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create scheduled report');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error creating scheduled report:', error);
      throw error;
    }
  }

  /**
   * Export report
   */
  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf'): Promise<Blob> {
    try {
      console.log('📤 Exporting report:', reportId, 'as', format);

      const response = await axios.get(
        `${API_URL}/api/reports/${reportId}/export?format=${format}`,
        {
          ...this.getAuthHeaders(),
          responseType: 'blob'
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Get report builder configuration
   */
  async getReportBuilderConfig(): Promise<ReportBuilderConfig> {
    try {
      console.log('🔧 Fetching report builder configuration');

      const response = await axios.get(
        `${API_URL}/api/reports/builder/config`,
        this.getAuthHeaders()
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch report builder configuration');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error fetching report builder config:', error);
      throw error;
    }
  }

  /**
   * Download exported report as file
   */
  async downloadReport(reportId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf', filename?: string): Promise<void> {
    try {
      const blob = await this.exportReport(reportId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `report_${reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('❌ Error downloading report:', error);
      throw error;
    }
  }
}

export const realReportsApi = new RealReportsApiService();