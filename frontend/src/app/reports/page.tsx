'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { 
  ChartBarIcon, 
  UsersIcon, 
  PhoneIcon,
  DocumentChartBarIcon,
  ClockIcon,
  ChartPieIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

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
        name: 'Call',
        description: 'Individual call records and analysis',
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Reports']);

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
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-kennex-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                router.push(`/reports/view?type=${report.id}&category=${selectedCategory}&subcategory=${selectedSubcategory}`);
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-kennex-600" />
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
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-lg text-gray-600">
          Comprehensive reporting suite with real-time analytics and performance metrics.
        </p>
      </div>
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
    </MainLayout>
  );
}