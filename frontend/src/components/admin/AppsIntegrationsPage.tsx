import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Phone, 
  Users, 
  Settings, 
  Check, 
  X, 
  ExternalLink,
  Shield,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Integration {
  id?: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isEnabled: boolean;
  isConfigured: boolean;
  isAvailable: boolean;
  enabledAt?: string;
  updatedAt?: string;
}

interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  isTestMode: boolean;
}

const AppsIntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig>({
    publishableKey: '',
    secretKey: '',
    isTestMode: true
  });
  const [showStripeConfig, setShowStripeConfig] = useState(false);
  
  useEffect(() => {
    fetchIntegrations();
  }, []);
  
  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setIntegrations(data.integrations);
      } else {
        setError(data.error || 'Failed to fetch integrations');
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      setError('Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleIntegration = async (integrationName: string, enabled: boolean) => {
    setConfiguring(integrationName);
    try {
      const response = await fetch(`/api/integrations/${integrationName}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchIntegrations();
        
        // Show configuration dialog if enabling Stripe
        if (integrationName === 'stripe' && enabled) {
          setShowStripeConfig(true);
        }
      } else {
        alert(data.error || 'Failed to update integration');
      }
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      alert('Failed to update integration');
    } finally {
      setConfiguring(null);
    }
  };
  
  const configureStripe = async () => {
    try {
      const response = await fetch('/api/integrations/stripe/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(stripeConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowStripeConfig(false);
        setStripeConfig({ publishableKey: '', secretKey: '', isTestMode: true });
        await fetchIntegrations();
        alert('Stripe configuration saved successfully!');
      } else {
        alert(data.error || 'Failed to configure Stripe');
      }
    } catch (error) {
      console.error('Failed to configure Stripe:', error);
      alert('Failed to configure Stripe');
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'payments':
        return <CreditCard className="w-6 h-6" />;
      case 'telephony':
        return <Phone className="w-6 h-6" />;
      case 'crm':
        return <Users className="w-6 h-6" />;
      default:
        return <Settings className="w-6 h-6" />;
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'payments':
        return 'bg-green-100 text-green-800';
      case 'telephony':
        return 'bg-blue-100 text-blue-800';
      case 'crm':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Apps & Integrations</h1>
        <p className="text-gray-600">
          Connect third-party services to enhance your call center operations
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className={`bg-white rounded-lg border-2 p-6 transition-all duration-200 ${
              integration.isEnabled 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getCategoryColor(integration.category)}`}>
                  {getCategoryIcon(integration.category)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {integration.displayName}
                  </h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(integration.category)}`}>
                    {integration.category}
                  </span>
                </div>
              </div>
              
              {integration.isEnabled ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <X className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              {integration.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {integration.isEnabled && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                    Active
                  </span>
                )}
                
                {integration.isEnabled && !integration.isConfigured && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Needs Setup
                  </span>
                )}
              </div>
              
              {integration.isAvailable ? (
                <button
                  onClick={() => toggleIntegration(integration.name, !integration.isEnabled)}
                  disabled={configuring === integration.name}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    integration.isEnabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {configuring === integration.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : integration.isEnabled ? (
                    'Disable'
                  ) : (
                    'Enable'
                  )}
                </button>
              ) : (
                <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-md">
                  Coming Soon
                </span>
              )}
            </div>
            
            {integration.name === 'stripe' && integration.isEnabled && !integration.isConfigured && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowStripeConfig(true)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Configure Stripe
                </button>
              </div>
            )}
            
            {integration.enabledAt && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Enabled on {new Date(integration.enabledAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Stripe Configuration Modal */}
      {showStripeConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Configure Stripe Integration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publishable Key
                </label>
                <input
                  type="text"
                  value={stripeConfig.publishableKey}
                  onChange={(e) => setStripeConfig({
                    ...stripeConfig,
                    publishableKey: e.target.value
                  })}
                  placeholder="pk_test_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={stripeConfig.secretKey}
                  onChange={(e) => setStripeConfig({
                    ...stripeConfig,
                    secretKey: e.target.value
                  })}
                  placeholder="sk_test_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="testMode"
                  checked={stripeConfig.isTestMode}
                  onChange={(e) => setStripeConfig({
                    ...stripeConfig,
                    isTestMode: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="testMode" className="ml-2 block text-sm text-gray-900">
                  Test Mode (recommended for testing)
                </label>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <Shield className="w-4 h-4 text-yellow-500 mt-0.5 mr-2" />
                  <div className="text-xs text-yellow-700">
                    <p className="font-medium">Security Notice</p>
                    <p>Your Stripe keys will be encrypted and stored securely. Never share these keys.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStripeConfig(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={configureStripe}
                disabled={!stripeConfig.publishableKey || !stripeConfig.secretKey}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Help Section */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-blue-700 mb-4">
          Get started with our integration guides and documentation.
        </p>
        <a
          href="#"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View Documentation
        </a>
      </div>
    </div>
  );
};

export default AppsIntegrationsPage;