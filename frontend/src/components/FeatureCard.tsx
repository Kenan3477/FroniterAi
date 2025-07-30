import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { trackEvent } from '../store/analyticsSlice';
import { 
  PlayIcon,
  CogIcon,
  ChartBarIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  lastUsed: number | null;
  usageCount: number;
  avgRating: number;
  permissions: string[];
}

interface FeatureCardProps {
  feature: FeatureCardData;
  isActive: boolean;
  onSelect: () => void;
  onUse: (parameters: any) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  isActive,
  onSelect,
  onUse,
}) => {
  const dispatch = useDispatch();
  const [showConfig, setShowConfig] = useState(false);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [rating, setRating] = useState(0);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Get icon component based on string
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      ChartBarIcon,
      CogIcon,
      PlayIcon,
      CheckCircleIcon,
      ExclamationTriangleIcon,
    };
    const IconComponent = icons[iconName] || ChartBarIcon;
    return <IconComponent className="h-6 w-6" />;
  };

  // Get status color based on feature state
  const getStatusColor = () => {
    if (!feature.enabled) return 'text-gray-400';
    if (isActive) return 'text-blue-600';
    if (feature.usageCount > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  // Get status text
  const getStatusText = () => {
    if (!feature.enabled) return 'Disabled';
    if (isActive) return 'Active';
    if (feature.lastUsed) return 'Recently used';
    return 'Available';
  };

  // Format last used time
  const formatLastUsed = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Handle feature use
  const handleUse = () => {
    if (!feature.enabled) return;

    dispatch(trackEvent({
      event: 'feature_used',
      properties: { 
        featureId: feature.id,
        category: feature.category,
        parameters: Object.keys(parameters)
      }
    }));

    onUse(parameters);
    setShowConfig(false);
    setParameters({});
  };

  // Handle rating
  const handleRating = (newRating: number) => {
    setRating(newRating);
    dispatch(trackEvent({
      event: 'feature_rated',
      properties: { 
        featureId: feature.id,
        rating: newRating
      }
    }));
  };

  // Render parameter input
  const renderParameterInput = (paramName: string, paramType: string) => {
    const value = parameters[paramName] || '';

    switch (paramType) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setParameters(prev => ({ ...prev, [paramName]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={`Enter ${paramName}...`}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setParameters(prev => ({ ...prev, [paramName]: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={`Enter ${paramName}...`}
          />
        );
      case 'boolean':
        return (
          <select
            value={value.toString()}
            onChange={(e) => setParameters(prev => ({ ...prev, [paramName]: e.target.value === 'true' }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      default:
        return (
          <textarea
            value={value}
            onChange={(e) => setParameters(prev => ({ ...prev, [paramName]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            rows={2}
            placeholder={`Enter ${paramName}...`}
          />
        );
    }
  };

  return (
    <div 
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
        isActive 
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
          : feature.enabled 
          ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600' 
          : 'border-gray-200 dark:border-gray-700 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isActive 
                ? 'bg-blue-100 dark:bg-blue-900' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <div className={getStatusColor()}>
                {getIconComponent(feature.icon)}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {feature.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              feature.enabled
                ? isActive
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Category and stats */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 dark:text-gray-400">
              Category: <span className="font-medium">{feature.category}</span>
            </span>
            
            {feature.usageCount > 0 && (
              <span className="text-gray-500 dark:text-gray-400">
                Used: <span className="font-medium">{feature.usageCount} times</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">
              {formatLastUsed(feature.lastUsed)}
            </span>
          </div>
        </div>

        {/* Rating */}
        {feature.avgRating > 0 && (
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIconSolid
                  key={star}
                  className={`h-4 w-4 ${
                    star <= feature.avgRating 
                      ? 'text-yellow-400' 
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {feature.avgRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onSelect}
            disabled={!feature.enabled}
            className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              isActive
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : feature.enabled
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            }`}
          >
            {isActive ? 'Selected' : 'Select'}
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            disabled={!feature.enabled}
            className={`px-3 py-2 rounded-md transition-colors ${
              showConfig
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Configure parameters"
          >
            <CogIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleUse}
            disabled={!feature.enabled || isConfiguring}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Run feature"
          >
            <PlayIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Configuration panel */}
      {showConfig && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Configure Parameters
          </h4>
          
          <div className="space-y-3">
            {/* Mock parameters - in a real implementation, these would come from the tool definition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time Range
              </label>
              {renderParameterInput('timeRange', 'string')}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Include Details
              </label>
              {renderParameterInput('includeDetails', 'boolean')}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Results
              </label>
              {renderParameterInput('maxResults', 'number')}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => {
                setParameters({});
                setShowConfig(false);
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            
            <button
              onClick={handleUse}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Apply & Run
            </button>
          </div>
        </div>
      )}

      {/* Rate this feature */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rate this feature:</span>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                {star <= rating ? (
                  <StarIconSolid className="h-4 w-4 text-yellow-400" />
                ) : (
                  <StarIcon className="h-4 w-4 text-gray-300 hover:text-yellow-400 dark:text-gray-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
