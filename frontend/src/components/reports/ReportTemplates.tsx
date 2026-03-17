/**
 * Real Reports Components - Report Templates Component
 * Replaces "NOT IMPLEMENTED" template system functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ChartBarIcon,
  UsersIcon,
  PhoneIcon,
  ClockIcon,
  EyeIcon,
  PlayIcon,
  ShareIcon,
  StarIcon,
  TagIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { realReportsApi, ReportTemplate, ReportData } from '../../services/realReportsApi';

interface ReportTemplatesProps {
  className?: string;
}

export const ReportTemplates: React.FC<ReportTemplatesProps> = ({ className = '' }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  const [generatingTemplate, setGeneratingTemplate] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    { id: 'all', name: 'All Templates', icon: DocumentTextIcon },
    { id: 'performance', name: 'Performance', icon: ChartBarIcon },
    { id: 'campaign', name: 'Campaign', icon: PhoneIcon },
    { id: 'agent', name: 'Agent Analytics', icon: UsersIcon },
    { id: 'outcome', name: 'Call Outcomes', icon: TagIcon },
    { id: 'custom', name: 'Custom Reports', icon: StarIcon }
  ];

  useEffect(() => {
    loadTemplates();
    loadFavorites();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await realReportsApi.getReportTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load report templates');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('report_favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const toggleFavorite = (templateId: string) => {
    const newFavorites = favorites.includes(templateId)
      ? favorites.filter(id => id !== templateId)
      : [...favorites, templateId];
    
    setFavorites(newFavorites);
    localStorage.setItem('report_favorites', JSON.stringify(newFavorites));
  };

  const generateReport = async (templateId: string) => {
    try {
      setGeneratingTemplate(templateId);
      setError(null);
      
      const filters = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      };

      const report = await realReportsApi.generateReport(templateId, filters);
      setGeneratedReport(report);
      setShowPreview(true);
      
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setGeneratingTemplate(null);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!generatedReport) return;

    try {
      await realReportsApi.downloadReport(
        generatedReport.id,
        format,
        `${generatedReport.title.replace(/\s+/g, '_')}.${format}`
      );
    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Failed to export report');
    }
  };

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case 'performance': return ChartBarIcon;
      case 'campaign': return PhoneIcon;
      case 'agent': return UsersIcon;
      case 'outcome': return TagIcon;
      default: return DocumentTextIcon;
    }
  };

  const getChartTypeIcon = (chartType?: string) => {
    switch (chartType) {
      case 'bar': return ChartBarIcon;
      case 'line': return ChartBarIcon;
      case 'pie': return ChartBarIcon;
      case 'table': return DocumentTextIcon;
      default: return DocumentTextIcon;
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const favoriteTemplates = templates.filter(template => favorites.includes(template.id));

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading report templates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadTemplates}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Category Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="h-4 w-4 mr-2" />
                {category.name}
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                  {category.id === 'all' ? templates.length : 
                   templates.filter(t => t.category === category.id).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Favorites Section */}
      {favoriteTemplates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <StarIconSolid className="h-5 w-5 text-yellow-400 mr-2" />
            Favorite Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteTemplates.slice(0, 3).map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorite={true}
                isGenerating={generatingTemplate === template.id}
                onToggleFavorite={toggleFavorite}
                onGenerate={generateReport}
              />
            ))}
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isFavorite={favorites.includes(template.id)}
            isGenerating={generatingTemplate === template.id}
            onToggleFavorite={toggleFavorite}
            onGenerate={generateReport}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-500">
              No report templates available for the selected category.
            </p>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showPreview && generatedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{generatedReport.title}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportReport('pdf')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  PDF
                </button>
                <button
                  onClick={() => exportReport('excel')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Excel
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Generated: {new Date(generatedReport.generatedAt).toLocaleString()}
                </p>
                <div className="mt-4">
                  <h4 className="font-medium">Summary</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(generatedReport.summary, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: ReportTemplate;
  isFavorite: boolean;
  isGenerating: boolean;
  onToggleFavorite: (id: string) => void;
  onGenerate: (id: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isFavorite,
  isGenerating,
  onToggleFavorite,
  onGenerate
}) => {
  const IconComponent = getTemplateIcon(template.category);
  const ChartIcon = getChartTypeIcon(template.chartType);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="p-2 bg-gray-100 rounded-lg">
            <IconComponent className="h-6 w-6 text-gray-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{template.category}</p>
          </div>
        </div>
        <button
          onClick={() => onToggleFavorite(template.id)}
          className="text-gray-400 hover:text-yellow-400"
        >
          {isFavorite ? (
            <StarIconSolid className="h-5 w-5 text-yellow-400" />
          ) : (
            <StarIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <p className="text-gray-700 text-sm mb-4">{template.description}</p>

      <div className="flex items-center text-sm text-gray-500 mb-4">
        <ChartIcon className="h-4 w-4 mr-1" />
        <span className="capitalize">{template.chartType || 'chart'}</span>
        <span className="mx-2">•</span>
        <CalendarIcon className="h-4 w-4 mr-1" />
        <span>{template.defaultDateRange} days</span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onGenerate(template.id)}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <PlayIcon className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600">
          <EyeIcon className="h-4 w-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600">
          <ShareIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const getTemplateIcon = (category: string) => {
  switch (category) {
    case 'performance': return ChartBarIcon;
    case 'campaign': return PhoneIcon;
    case 'agent': return UsersIcon;
    case 'outcome': return TagIcon;
    default: return DocumentTextIcon;
  }
};

const getChartTypeIcon = (chartType?: string) => {
  switch (chartType) {
    case 'bar': case 'line': case 'pie': return ChartBarIcon;
    case 'table': return DocumentTextIcon;
    default: return DocumentTextIcon;
  }
};