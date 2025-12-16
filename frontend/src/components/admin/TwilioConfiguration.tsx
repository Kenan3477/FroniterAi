/**
 * Twilio Configuration Admin Panel
 * Configure Twilio SIP Domain settings and credentials
 */

import React, { useState } from 'react';
import { 
  PhoneIcon, 
  ServerIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface TwilioConfiguration {
  sipDomain: string;
  username: string;
  password: string;
  isActive: boolean;
  description?: string;
}

const TwilioConfiguration = () => {
  const [config, setConfig] = useState<TwilioConfiguration>({
    sipDomain: process.env.NEXT_PUBLIC_TWILIO_SIP_DOMAIN || '',
    username: process.env.NEXT_PUBLIC_TWILIO_SIP_USERNAME || '',
    password: process.env.NEXT_PUBLIC_TWILIO_SIP_PASSWORD || '',
    isActive: true,
    description: 'Twilio SIP Domain Configuration'
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleConfigUpdate = (field: keyof TwilioConfiguration, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const testTwilioConnection = async () => {
    // TODO: Implement actual Twilio connection test
    console.log('Testing Twilio connection...', config);
    alert('Connection test will be implemented with actual Twilio SIP client');
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <PhoneIcon className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Twilio Configuration</h1>
              <p className="text-gray-600 mt-1">Configure Twilio SIP Domain settings and credentials</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status Banner */}
          <div className="mb-6">
            {config.sipDomain && config.username && config.password ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Twilio Configuration Complete</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your Twilio SIP Domain is configured and ready to use.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Configuration Incomplete</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please configure your Twilio SIP Domain credentials below.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ServerIcon className="h-4 w-4 inline mr-2" />
                Twilio SIP Domain
              </label>
              <input
                type="text"
                value={config.sipDomain}
                onChange={(e) => handleConfigUpdate('sipDomain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="yourcompany.sip.twilio.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <KeyIcon className="h-4 w-4 inline mr-2" />
                SIP Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => handleConfigUpdate('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your Twilio username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <KeyIcon className="h-4 w-4 inline mr-2" />
                SIP Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password}
                  onChange={(e) => handleConfigUpdate('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your Twilio password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={config.description || ''}
                onChange={(e) => handleConfigUpdate('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Twilio SIP Domain Configuration"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={testTwilioConnection}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CogIcon className="h-4 w-4 inline mr-2" />
              Test Connection
            </button>
            
            <button
              onClick={() => {
                console.log('Saving configuration:', config);
                alert('Configuration saved! (In production, this would save to your database)');
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Setup Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Log into your Twilio Console</li>
              <li>Navigate to Voice → SIP Domains</li>
              <li>Create or select your SIP Domain</li>
              <li>Copy the domain name and enter it above</li>
              <li>Create SIP credentials and enter the username/password</li>
              <li>Test the connection to verify setup</li>
            </ol>
          </div>

          {/* Current Configuration Display */}
          {config.sipDomain && (
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Current Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">SIP Domain:</span>
                  <span className="ml-2 font-mono text-gray-900">{config.sipDomain}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Username:</span>
                  <span className="ml-2 font-mono text-gray-900">{config.username}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwilioConfiguration;