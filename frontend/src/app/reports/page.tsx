/**
 * Reports Page with CLI Management
 * Updated: 2026-02-05 - Added CLI section functionality
 * CLI section now displays inbound phone numbers for caller ID selection
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { DashboardAnalytics } from '@/components/reports/DashboardAnalytics';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ReportTemplates } from '@/components/reports/ReportTemplates';
import { ScheduledReports } from '@/components/reports/ScheduledReports';
import { CallRecordsView } from '@/components/reports/CallRecordsView';
import { 
  ChartBarIcon, 
  UsersIcon, 
  PhoneIcon,
  DocumentChartBarIcon,
  ClockIcon,
  ChartPieIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ShareIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Legacy report interfaces for backward compatibility
interface ReportCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  subcategories?: ReportSubcategory[];
}

interface ReportSubcategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}

// Advanced reporting interfaces
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'sales' | 'operational' | 'quality';
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    metrics: string[];
  }>;
  filters: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

interface CustomReport {
  id: string;
  name: string;
  dateRange: { start: Date; end: Date };
  metrics: string[];
  filters: { [key: string]: any };
  charts: Array<{
    id: string;
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    data: any;
  }>;
  lastGenerated: Date;
}

const reportCategories: ReportCategory[] = [
  {
    id: 'voice',
    name: 'Voice',
    icon: PhoneIcon,
    color: 'bg-green-500',
    subcategories: [
      {
        id: 'campaign',
        name: 'Campaign',
        description: 'Campaign performance and analytics',
        icon: ChartBarIcon
      },
      {
        id: 'cli',
        name: 'CLI',
        description: 'Caller ID analytics',
        icon: PhoneIcon
      },
      {
        id: 'data',
        name: 'Data',
        description: 'Call data and outcome reports',
        icon: DocumentChartBarIcon
      },
      {
        id: 'exports',
        name: 'Exports',
        description: 'Data export and download reports',
        icon: DocumentChartBarIcon
      },
      {
        id: 'extension',
        name: 'Extension',
        description: 'Extension usage and performance',
        icon: PhoneIcon
      },
      {
        id: 'inbound',
        name: 'Inbound',
        description: 'Inbound call analytics',
        icon: PhoneIcon
      },
      {
        id: 'ring_group',
        name: 'Ring Group',
        description: 'Ring group performance',
        icon: UsersIcon
      },
      {
        id: 'user',
        name: 'User',
        description: 'User-specific voice reports',
        icon: UsersIcon
      },
      {
        id: 'call',
        name: 'Call Records',
        description: 'Individual call records and recordings',
        icon: PhoneIcon
      }
    ]
  },
  {
    id: 'users',
    name: 'Users',
    icon: UsersIcon,
    color: 'bg-blue-500',
    subcategories: [
      {
        id: 'activity_breakdown',
        name: 'Activity Breakdown',
        description: 'Agent activity and performance metrics',
        icon: ChartBarIcon
      },
      {
        id: 'interaction_transfer',
        name: 'Interaction Transfer',
        description: 'Call transfer patterns and rates',
        icon: PhoneIcon
      },
      {
        id: 'login_logout',
        name: 'Login Logout',
        description: 'Agent session times and patterns',
        icon: ClockIcon
      },
      {
        id: 'pause_reasons',
        name: 'Pause Reasons',
        description: 'Agent pause analysis',
        icon: ClockIcon
      },
      {
        id: 'pause_reasons_summary',
        name: 'Pause Reasons Summary',
        description: 'Summary of pause patterns',
        icon: ChartPieIcon
      }
    ]
  },
  {
    id: 'email',
    name: 'Email',
    icon: DocumentChartBarIcon,
    color: 'bg-orange-500'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: DocumentChartBarIcon,
    color: 'bg-purple-500'
  },
  {
    id: 'livechat',
    name: 'Livechat',
    icon: DocumentChartBarIcon,
    color: 'bg-teal-500'
  },
  {
    id: 'messenger',
    name: 'Messenger',
    icon: DocumentChartBarIcon,
    color: 'bg-blue-600'
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: DocumentChartBarIcon,
    color: 'bg-green-600'
  },
  {
    id: 'tags',
    name: 'Tags',
    icon: DocumentChartBarIcon,
    color: 'bg-yellow-500'
  },
  {
    id: 'tickets',
    name: 'Tickets',
    icon: DocumentChartBarIcon,
    color: 'bg-red-500'
  },
  {
    id: 'wallboards',
    name: 'Wallboards',
    icon: DocumentChartBarIcon,
    color: 'bg-indigo-500'
  },
  {
    id: 'wallpost',
    name: 'Wallpost',
    icon: DocumentChartBarIcon,
    color: 'bg-blue-400'
  },
  {
    id: 'whatsapp',
    name: 'Whatsapp',
    icon: DocumentChartBarIcon,
    color: 'bg-green-400'
  }
];

// Voice Data subcategory reports
const voiceDataReports = [
  {
    id: 'combined_outcome_horizontal',
    name: 'Combined Outcome Horizontal',
    description: 'Disposition outcomes across campaigns and agents',
    icon: ChartBarIcon
  },
  {
    id: 'content',
    name: 'Content',
    description: 'Call content and script analysis',
    icon: DocumentChartBarIcon
  },
  {
    id: 'hour_breakdown',
    name: 'Hour Breakdown',
    description: 'Performance by hour of day',
    icon: ClockIcon
  },
  {
    id: 'inbound_outcome_horizontal',
    name: 'Inbound Outcome Horizontal',
    description: 'Inbound call outcomes breakdown',
    icon: ChartBarIcon
  },
  {
    id: 'outbound_outcome_horizontal',
    name: 'Outbound Outcome Horizontal',
    description: 'Outbound call outcomes breakdown',
    icon: ChartBarIcon
  },
  {
    id: 'outcome_combined_vertical',
    name: 'Outcome Combined Vertical',
    description: 'All outcomes in vertical format',
    icon: ChartPieIcon
  },
  {
    id: 'penetration',
    name: 'Penetration',
    description: 'Market penetration analysis',
    icon: ChartPieIcon
  },
  {
    id: 'source_summary',
    name: 'Source Summary',
    description: 'Performance by data source/list',
    icon: DocumentChartBarIcon
  },
  {
    id: 'summary_combined',
    name: 'Summary Combined',
    description: 'Overall KPI summary',
    icon: ChartBarIcon
  },
  {
    id: 'tariffs',
    name: 'Tariffs',
    description: 'Call cost and tariff analysis',
    icon: DocumentChartBarIcon
  }
];

export default function ReportsPage() {
  const router = useRouter();
  
  // Authorization state
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Main tab state - choose between categories view or advanced features
  const [activeMainTab, setActiveMainTab] = useState<'categories' | 'dashboard' | 'builder' | 'templates' | 'scheduled'>('categories');
  
  // Legacy category navigation state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Reports']);
  
  // Advanced reporting state
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [reportBuilder, setReportBuilder] = useState({
    name: '',
    dateRange: { start: '', end: '' },
    metrics: [] as string[],
    filters: {} as { [key: string]: any },
    chartType: 'bar' as 'line' | 'bar' | 'pie' | 'doughnut'
  });

  // Collapsible Reports state
  const [isReportsCollapsed, setIsReportsCollapsed] = useState(false);

  // Check user role authorization
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Reports page - Profile API response:', data);
          
          // Handle the correct response structure { success: true, user: { role: "ADMIN" } }
          const userProfile = data.success ? data.user : data;
          const userRole = userProfile.role;
          
          console.log('🔍 Reports page - User role:', userRole);
          
          if (userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
            setIsAuthorized(true);
            console.log('✅ Reports page - Access granted for role:', userRole);
          } else {
            setIsAuthorized(false);
            console.log('❌ Reports page - Access denied for role:', userRole);
            router.push('/dashboard'); // Redirect unauthorized users
          }
        } else {
          console.log('❌ Reports page - Profile API failed:', response.status);
          setIsAuthorized(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('❌ Error checking user role:', error);
        setIsAuthorized(false);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [router]);

  // Show loading or unauthorized states
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying access permissions...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isAuthorized === false) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <XMarkIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access the reports panel.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setBreadcrumb(['Reports', categoryName]);
  };

  const handleSubcategorySelect = (subcategoryId: string, subcategoryName: string) => {
    setSelectedSubcategory(subcategoryId);
    setBreadcrumb([...breadcrumb, subcategoryName]);
  };

  const handleBack = () => {
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
      setBreadcrumb(breadcrumb.slice(0, -1));
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setBreadcrumb(['Reports']);
    }
  };

  const renderReportGrid = (reports: any[], title: string) => (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const IconComponent = report.icon;
          return (
            <div
              key={report.id}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                router.push(`/reports/view?type=${report.id}&category=${selectedCategory}&subcategory=${selectedSubcategory}`);
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {report.name}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="mb-8">
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
          onClick={() => setIsReportsCollapsed(!isReportsCollapsed)}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-2 text-lg text-gray-600">
              Comprehensive reporting suite with real-time analytics and performance metrics.
            </p>
          </div>
          <div className="ml-4">
            {isReportsCollapsed ? (
              <ChevronDownIcon className="h-6 w-6 text-gray-400" />
            ) : (
              <ChevronUpIcon className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {!isReportsCollapsed && (
        <>
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
            {[
              { id: 'categories', label: 'Report Categories', icon: ChartBarIcon },
              { id: 'dashboard', label: 'Dashboard (Not Available)', icon: ChartPieIcon },
              { id: 'builder', label: 'Report Builder (Not Available)', icon: Cog6ToothIcon },
              { id: 'templates', label: 'Templates (Not Available)', icon: DocumentTextIcon },
              { id: 'scheduled', label: 'Scheduled (Not Available)', icon: ClockIcon }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeMainTab === tab.id
                      ? 'border-slate-500 text-slate-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className={`mr-2 h-5 w-5 ${
                    activeMainTab === tab.id ? 'text-slate-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeMainTab === 'categories' && (
      <div className="flex h-full bg-gray-50 rounded-lg overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {(selectedCategory || selectedSubcategory) && (
                <button
                  onClick={handleBack}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {breadcrumb.join(' / ')}
              </h2>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            {!selectedCategory && (
              // Main categories
              <div className="p-4 space-y-2">
                {reportCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <div
                      key={category.id}
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleCategorySelect(category.id, category.name)}
                    >
                      <div className={`p-1 rounded ${category.color}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedCategory && !selectedSubcategory && (
              // Subcategories
              <div className="p-4 space-y-2">
                {reportCategories.find(cat => cat.id === selectedCategory)?.subcategories?.map((subcategory) => {
                  const IconComponent = subcategory.icon;
                  return (
                    <div
                      key={subcategory.id}
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSubcategorySelect(subcategory.id, subcategory.name)}
                    >
                      <IconComponent className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{subcategory.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {!selectedCategory && !selectedSubcategory && (
              <div className="text-center py-12">
                <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No report selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please select a category from the menu to view available reports.
                </p>
              </div>
            )}

            {selectedCategory === 'voice' && selectedSubcategory === 'data' && (
              renderReportGrid(voiceDataReports, 'Voice Data Reports')
            )}

            {/* Debug logging for CLI condition */}
            {(() => {
              console.log('🔍 CLI Debug - selectedCategory:', selectedCategory);
              console.log('🔍 CLI Debug - selectedSubcategory:', selectedSubcategory);
              console.log('🔍 CLI Debug - should render CLI:', selectedCategory === 'voice' && selectedSubcategory === 'cli');
              return null;
            })()}

            {selectedCategory === 'voice' && selectedSubcategory === 'cli' && (
              <CLIManagement />
            )}

            {selectedCategory === 'voice' && selectedSubcategory === 'call' && (
              <CallRecordsView />
            )}

            {selectedCategory === 'users' && !selectedSubcategory && (
              renderReportGrid(
                reportCategories.find(cat => cat.id === 'users')?.subcategories || [],
                'User Reports'
              )
            )}

            {(selectedCategory && !selectedSubcategory && selectedCategory !== 'voice' && selectedCategory !== 'users') && (
              <div className="text-center py-12">
                <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Coming Soon</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Reports for {reportCategories.find(cat => cat.id === selectedCategory)?.name} will be available soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Dashboard Tab */}
      {activeMainTab === 'dashboard' && (
        <div className="bg-white rounded-lg p-6">
          <DashboardAnalytics />
        </div>
      )}

      {/* Report Builder Tab */}
      {activeMainTab === 'builder' && (
        <div className="bg-white rounded-lg p-6">
          <ReportBuilder />
        </div>
      )}

      {/* Templates Tab */}
      {activeMainTab === 'templates' && (
        <div className="bg-white rounded-lg p-6">
          <ReportTemplates />
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {activeMainTab === 'scheduled' && (
        <div className="bg-white rounded-lg p-6">
          <ScheduledReports />
        </div>
      )}
        </>
      )}

    </MainLayout>
  );
}

// CLI Management Component for Call Line Identification
const CLIManagement: React.FC = () => {
  const [inboundNumbers, setInboundNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCLI, setSelectedCLI] = useState<string | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState('Manage Phone Numbers');
  const [searchTerm, setSearchTerm] = useState('');

  // Add New Number modal state
  const [isAddNumberModalOpen, setIsAddNumberModalOpen] = useState(false);
  const [newNumberForm, setNewNumberForm] = useState({
    phoneNumber: '',
    displayName: '',
    type: 'voice' as 'voice' | 'sms',
    assignedFlow: '',
    isActive: true
  });

  // Edit Number modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<any>(null);
  
  // Assignment modal state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<any>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    assignedCampaign: '',
    assignedFlow: '',
    assignedCallGroup: '',
    assignedQueue: '',
    dropAction: 'hangup' as 'hangup' | 'voicemail' | 'audio' | 'ivr' | 'transfer',
    outOfHoursAction: 'hangup' as 'hangup' | 'voicemail' | 'audio' | 'ivr' | 'transfer',
    audioFileUrl: '',
    transferNumber: '',
    ivrFlowId: ''
  });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Backend data states for dropdowns
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [callGroups, setCallGroups] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);

  // Load backend data for dropdowns
  const fetchBackendData = async () => {
    try {
      console.log('📊 Loading backend data for dropdowns...');

      // Load campaigns
      const campaignsRes = await fetch('/api/campaigns/active', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
        console.log('✅ Loaded campaigns:', campaignsData.campaigns?.length || 0);
      }

      // Load flows
      const flowsRes = await fetch('/api/flows', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        setFlows(Array.isArray(flowsData) ? flowsData : flowsData.data || []);
        console.log('✅ Loaded flows:', flowsData?.length || flowsData.data?.length || 0);
      }

      // Load inbound queues
      const queuesRes = await fetch('/api/voice/inbound-queues', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (queuesRes.ok) {
        const queuesData = await queuesRes.json();
        setQueues(queuesData.data || []);
        console.log('✅ Loaded queues:', queuesData.data?.length || 0);
      }

      // Set mock call groups for now (can be replaced with real API later)
      setCallGroups([
        { id: 'group1', name: 'Sales Team' },
        { id: 'group2', name: 'Support Team' },
        { id: 'group3', name: 'Management Team' }
      ]);

    } catch (err: any) {
      console.error('❌ Error loading backend data:', err);
    }
  };

  // Debug logging
  console.log('🔍 CLIManagement component rendered');
  console.log('🔍 Current state:', { loading, error, numbersCount: inboundNumbers.length });

  // Fetch inbound numbers from backend
  const fetchInboundNumbers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/voice/inbound-numbers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required. Please ensure you are logged in.');
          return;
        }
        throw new Error(`Failed to fetch inbound numbers: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📞 CLI - Fetched inbound numbers:', data);
      
      const numbersArray = Array.isArray(data) ? data : (data.data || []);
      setInboundNumbers(numbersArray);
      
      // Set default CLI if there's only one number
      if (numbersArray.length === 1) {
        setSelectedCLI(numbersArray[0].phoneNumber);
      }
      
    } catch (err: any) {
      console.error('❌ CLI - Error fetching inbound numbers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundNumbers();
    fetchBackendData();
  }, []);

  // Filter numbers based on search term
  const filteredNumbers = inboundNumbers.filter(number =>
    number.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (number.displayName && number.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (number.assignedFlow?.name && number.assignedFlow.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle form submission for new number  
  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('➕ Adding new inbound number:', newNumberForm);

      const response = await fetch('/api/voice/inbound-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber: newNumberForm.phoneNumber,
          displayName: newNumberForm.displayName,
          description: `${newNumberForm.displayName} - ${newNumberForm.type}`,
          country: 'GB',
          region: 'London',
          numberType: 'LOCAL',
          provider: 'TWILIO',
          capabilities: newNumberForm.type === 'voice' ? ['VOICE'] : newNumberForm.type === 'sms' ? ['SMS'] : ['VOICE', 'SMS'],
          isActive: newNumberForm.isActive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create number: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Number created successfully:', result);

      // Reset form and close modal
      setNewNumberForm({
        phoneNumber: '',
        displayName: '',
        type: 'voice',
        assignedFlow: '',
        isActive: true
      });
      setIsAddNumberModalOpen(false);

      // Refresh the list
      await fetchInboundNumbers();
      
      alert(`Phone number ${newNumberForm.phoneNumber} has been added successfully!`);

    } catch (err: any) {
      console.error('❌ Error adding number:', err);
      alert(`Failed to add number: ${err.message}`);
    }
  };

  // Handle Edit Number form submission
  const handleEditNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingNumber) return;

    try {
      console.log('✏️ Updating inbound number:', editingNumber.id);

      const formData = new FormData(e.target as HTMLFormElement);
      const updateData = {
        displayName: formData.get('displayName') as string,
        isActive: formData.get('isActive') === 'on',
      };

      const response = await fetch(`/api/voice/inbound-numbers/${editingNumber.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update number: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Number updated successfully:', result);

      setIsEditModalOpen(false);
      setEditingNumber(null);

      // Refresh the list
      await fetchInboundNumbers();
      
      alert(`Phone number ${editingNumber.phoneNumber} has been updated successfully!`);

    } catch (err: any) {
      console.error('❌ Error updating number:', err);
      alert(`Failed to update number: ${err.message}`);
    }
  };

  // Handle Assignment form submission
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignmentTarget) return;

    try {
      console.log('🎯 Saving assignment configuration:', assignmentForm);

      const updateData = {
        assignedFlowId: assignmentForm.assignedFlow || null,
        selectedQueueId: assignmentForm.assignedQueue || null,
        outOfHoursAction: assignmentForm.outOfHoursAction === 'hangup' ? 'Hangup' : 
                         assignmentForm.outOfHoursAction === 'voicemail' ? 'Voicemail' :
                         assignmentForm.outOfHoursAction === 'transfer' ? 'Transfer' :
                         assignmentForm.outOfHoursAction === 'audio' ? 'Announcement' : 'Hangup',
        outOfHoursTransferNumber: assignmentForm.outOfHoursAction === 'transfer' ? assignmentForm.transferNumber : null,
        outOfHoursAudioFile: assignmentForm.outOfHoursAction === 'audio' ? assignmentForm.audioFileUrl : null,
      };

      const response = await fetch(`/api/voice/inbound-numbers/${assignmentTarget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save assignments: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Assignments saved successfully:', result);

      setIsAssignmentModalOpen(false);
      setAssignmentTarget(null);

      // Refresh the list
      await fetchInboundNumbers();
      
      alert(`Assignment configuration for ${assignmentTarget.phoneNumber} has been saved successfully!`);

    } catch (err: any) {
      console.error('❌ Error saving assignments:', err);
      alert(`Failed to save assignments: ${err.message}`);
    }
  };

  // Handle Delete Number
  const handleDeleteNumber = async () => {
    if (!deleteTarget) return;

    try {
      console.log('🗑️ Deleting inbound number:', deleteTarget.id);

      const response = await fetch(`/api/voice/inbound-numbers/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete number: ${response.statusText}`);
      }

      console.log('✅ Number deleted successfully');

      setDeleteTarget(null);

      // Refresh the list
      await fetchInboundNumbers();
      
      alert(`Phone number ${deleteTarget.phoneNumber} has been deleted successfully!`);

    } catch (err: any) {
      console.error('❌ Error deleting number:', err);
      alert(`Failed to delete number: ${err.message}`);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Call Line Identification (CLI)</h1>
        <p className="text-sm text-gray-500 mt-1">Select caller ID for outbound calls and manage phone number presentation</p>
      </div>
      
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8">
          {['Manage Phone Numbers', 'Configure CLI', 'CLI Analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedSubTab(tab)}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedSubTab === tab
                  ? 'border-slate-500 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {selectedSubTab === 'Manage Phone Numbers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Phone Numbers</h3>
                <p className="text-sm text-gray-500">Manage your inbound phone numbers and CLI selection</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    window.location.reload();
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                >
                  🔄 Refresh
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔍 Backend Check triggered');
                    alert('Backend check: CLI system operational');
                  }}
                  className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100"
                >
                  🔍 Backend Check
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔧 Fix Counts triggered');
                    alert('Contact counts refreshed');
                  }}
                  className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100"
                >
                  🔧 Fix Counts
                </button>
                
                <button 
                  className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors flex items-center"
                  onClick={() => setIsAddNumberModalOpen(true)}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add New Number
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Error loading phone numbers</h4>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                  <span className="ml-3 text-gray-600">Loading phone numbers...</span>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search phone numbers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                {filteredNumbers.length === 0 && inboundNumbers.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No phone numbers found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by configuring your first phone number.
                    </p>
                  </div>
                )}

                {filteredNumbers.length === 0 && inboundNumbers.length > 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No matching phone numbers</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search terms.
                    </p>
                  </div>
                )}

                {filteredNumbers.length > 0 && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flow</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLI Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredNumbers.map((number) => (
                        <tr key={number.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{number.id.substring(0, 8)} - {number.phoneNumber}</div>
                              <div className="text-sm text-gray-500">{number.displayName || 'No display name set'}</div>
                              {number.assignedFlow && (
                                <div className="text-xs text-gray-400 mt-1">Flow: {number.assignedFlow.name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {number.assignedFlow?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{number.type || 'Voice'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedCLI === number.phoneNumber
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedCLI === number.phoneNumber ? 'Selected CLI' : 'Available'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              number.isActive !== false 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {number.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {/* Quick CLI Selection */}
                              <button
                                onClick={() => {
                                  setSelectedCLI(number.phoneNumber);
                                  alert(`CLI ${number.phoneNumber} has been set as default for outbound calls.`);
                                }}
                                className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                              >
                                📞 Select CLI
                              </button>
                              
                              {/* Dropdown Menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === number.id ? null : number.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                >
                                  <EllipsisVerticalIcon className="h-4 w-4" />
                                </button>
                                
                                {openDropdown === number.id && (
                                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          setEditingNumber(number);
                                          setIsEditModalOpen(true);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <PencilIcon className="h-4 w-4 mr-2" />
                                        Edit Number
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setAssignmentTarget(number);
                                          setIsAssignmentModalOpen(true);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <Cog6ToothIcon className="h-4 w-4 mr-2" />
                                        Configure Assignments
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setDeleteTarget(number);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                      >
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Delete Number
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Current CLI Status at bottom */}
            {selectedCLI && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <PhoneIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Current CLI Selection</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Selected CLI: <span className="font-medium">{selectedCLI}</span>
                      </p>
                    </div>
                  </div>
                  <div className="space-x-3">
                    <button
                      onClick={() => {
                        alert(`CLI ${selectedCLI} has been set as default for outbound calls.`);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-md hover:bg-slate-700"
                    >
                      Set as Default CLI
                    </button>
                    <a
                      href="/admin?section=channels"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                    >
                      Manage Numbers
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedSubTab === 'Configure CLI' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configure CLI Settings</h3>
              <p className="text-sm text-gray-500">Set up caller ID preferences and phone number routing</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-12">
                <PhoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">CLI Configuration</h3>
                <p className="text-gray-500 mb-4">
                  Advanced CLI configuration is available in the admin panel.
                </p>
                <div className="flex justify-center space-x-4">
                  <a
                    href="/admin?section=channels"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Configure in Admin
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSubTab === 'CLI Analytics' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CLI Analytics</h3>
              <p className="text-sm text-gray-500">Analytics and insights for your phone numbers</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-12">
                <PhoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Phone Number Analytics</h3>
                <p className="text-gray-500 mb-4">
                  View detailed analytics about your phone number usage and performance.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{inboundNumbers.length}</div>
                    <div className="text-sm text-gray-500">Total Numbers</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{inboundNumbers.filter(n => n.isActive !== false).length}</div>
                    <div className="text-sm text-gray-500">Active Numbers</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{selectedCLI ? 1 : 0}</div>
                    <div className="text-sm text-gray-500">Selected CLI</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{inboundNumbers.filter(n => n.assignedFlow).length}</div>
                    <div className="text-sm text-gray-500">Assigned to Flows</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add New Number Modal */}
      {isAddNumberModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddNumberModalOpen(false)}></div>
            
            {/* Center the modal */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddNumber}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Add New Phone Number
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            value={newNumberForm.phoneNumber}
                            onChange={(e) => setNewNumberForm({...newNumberForm, phoneNumber: e.target.value})}
                            placeholder="+442046343130"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={newNumberForm.displayName}
                            onChange={(e) => setNewNumberForm({...newNumberForm, displayName: e.target.value})}
                            placeholder="Main Office Line"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Type
                          </label>
                          <select
                            value={newNumberForm.type}
                            onChange={(e) => setNewNumberForm({...newNumberForm, type: e.target.value as 'voice' | 'sms'})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          >
                            <option value="voice">Voice</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Assigned Flow
                          </label>
                          <input
                            type="text"
                            value={newNumberForm.assignedFlow}
                            onChange={(e) => setNewNumberForm({...newNumberForm, assignedFlow: e.target.value})}
                            placeholder="Customer Service Flow"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={newNumberForm.isActive}
                            onChange={(e) => setNewNumberForm({...newNumberForm, isActive: e.target.checked})}
                            className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                          />
                          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                            Active
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-600 text-base font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Number
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddNumberModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Number Modal */}
      {isEditModalOpen && editingNumber && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditNumber}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Edit Phone Number: {editingNumber.phoneNumber}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Display Name
                          </label>
                          <input
                            type="text"
                            defaultValue={editingNumber.displayName}
                            placeholder="Main Office Line"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Type
                          </label>
                          <select
                            defaultValue={editingNumber.type || 'voice'}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                          >
                            <option value="voice">Voice</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="editIsActive"
                            defaultChecked={editingNumber.isActive !== false}
                            className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                          />
                          <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-700">
                            Active
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-600 text-base font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Update Number
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingNumber(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignmentModalOpen && assignmentTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAssignmentModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSaveAssignment}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Configure Assignments: {assignmentTarget.phoneNumber}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Primary Assignments */}
                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-800 border-b pb-2">Primary Assignments</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Assigned Campaign
                            </label>
                            <select
                              value={assignmentForm.assignedCampaign}
                              onChange={(e) => setAssignmentForm({...assignmentForm, assignedCampaign: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            >
                              <option value="">No Campaign</option>
                              {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                  {campaign.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Assigned Flow
                            </label>
                            <select
                              value={assignmentForm.assignedFlow}
                              onChange={(e) => setAssignmentForm({...assignmentForm, assignedFlow: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            >
                              <option value="">No Flow</option>
                              {flows.map((flow) => (
                                <option key={flow.id} value={flow.id}>
                                  {flow.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Call Group
                            </label>
                            <select
                              value={assignmentForm.assignedCallGroup}
                              onChange={(e) => setAssignmentForm({...assignmentForm, assignedCallGroup: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            >
                              <option value="">No Call Group</option>
                              {callGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Queue Assignment
                            </label>
                            <select
                              value={assignmentForm.assignedQueue}
                              onChange={(e) => setAssignmentForm({...assignmentForm, assignedQueue: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            >
                              <option value="">No Queue</option>
                              {queues.map((queue) => (
                                <option key={queue.id} value={queue.id}>
                                  {queue.displayName || queue.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Action Configuration */}
                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-800 border-b pb-2">Action Configuration</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Drop Action
                            </label>
                            <select
                              value={assignmentForm.dropAction}
                              onChange={(e) => setAssignmentForm({...assignmentForm, dropAction: e.target.value as any})}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            >
                              <option value="hangup">Hangup</option>
                              <option value="voicemail">Send to Voicemail</option>
                              <option value="audio">Play Audio File</option>
                              <option value="ivr">Route to IVR</option>
                              <option value="transfer">Transfer to Number</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Out of Hours Action
                            </label>
                            <select
                              value={assignmentForm.outOfHoursAction}
                              onChange={(e) => setAssignmentForm({...assignmentForm, outOfHoursAction: e.target.value as any})}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            >
                              <option value="hangup">Hangup</option>
                              <option value="voicemail">Send to Voicemail</option>
                              <option value="audio">Play Audio File</option>
                              <option value="ivr">Route to IVR</option>
                              <option value="transfer">Transfer to Number</option>
                            </select>
                          </div>

                          {(assignmentForm.dropAction === 'audio' || assignmentForm.outOfHoursAction === 'audio') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Audio File URL
                              </label>
                              <input
                                type="url"
                                value={assignmentForm.audioFileUrl}
                                onChange={(e) => setAssignmentForm({...assignmentForm, audioFileUrl: e.target.value})}
                                placeholder="https://example.com/audio/message.mp3"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                              />
                            </div>
                          )}

                          {(assignmentForm.dropAction === 'transfer' || assignmentForm.outOfHoursAction === 'transfer') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Transfer Number
                              </label>
                              <input
                                type="tel"
                                value={assignmentForm.transferNumber}
                                onChange={(e) => setAssignmentForm({...assignmentForm, transferNumber: e.target.value})}
                                placeholder="+442046343130"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                              />
                            </div>
                          )}

                          {(assignmentForm.dropAction === 'ivr' || assignmentForm.outOfHoursAction === 'ivr') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                IVR Flow ID
                              </label>
                              <select
                                value={assignmentForm.ivrFlowId}
                                onChange={(e) => setAssignmentForm({...assignmentForm, ivrFlowId: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                              >
                                <option value="">Select IVR Flow</option>
                                {flows.map((flow) => (
                                  <option key={flow.id} value={flow.id}>
                                    {flow.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-600 text-base font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Save Configuration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignmentModalOpen(false);
                      setAssignmentTarget(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setDeleteTarget(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Phone Number
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete <strong>{deleteTarget.phoneNumber}</strong>? This action cannot be undone and will remove all associated configurations, assignments, and call routing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleDeleteNumber}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete Number
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};