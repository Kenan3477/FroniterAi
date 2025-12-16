/**
 * Connex Ring Groups - Exact Implementation Matching Connex Screenshots
 * Complete multi-step wizard and form implementation
 */

import React, { useState } from 'react';
import {
  UsersIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Connex Ring Group Interface - Exact Match
export interface ConnexRingGroup {
  id: string;
  name: string; // Ring Group Name
  description: string; // Ring Group Description
  displayName: string; // Display Name
  businessHours: string; // Business Hours
  outOfHoursAction: string; // If Out Of Hours
  dayClosedAction: string; // If Day Closed
  ringGroupType: string; // Ring Group Type
  extensions: string[]; // Array of extension names
  queues: string; // Queues
  ringTime: number; // Ring Time (sec)
  dropAction: string; // Drop Action
  enabled: boolean;
  createdAt: string;
}

// Connex Ring Groups Manager - Matching Screenshots Exactly
export const ConnexRingGroupsManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  const [ringGroups, setRingGroups] = useState<ConnexRingGroup[]>(config.ringGroups || []);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ConnexRingGroup | null>(null);

  const handleSave = (group: ConnexRingGroup) => {
    let updatedGroups;
    if (editingGroup) {
      updatedGroups = ringGroups.map(g => g.id === group.id ? group : g);
    } else {
      updatedGroups = [...ringGroups, { ...group, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    }
    
    setRingGroups(updatedGroups);
    onUpdate({ ...config, ringGroups: updatedGroups });
    setShowCreateForm(false);
    setShowEditForm(false);
    setEditingGroup(null);
  };

  const handleEdit = (group: ConnexRingGroup) => {
    setEditingGroup(group);
    setShowEditForm(true);
  };

  const handleDelete = (id: string) => {
    const updatedGroups = ringGroups.filter(g => g.id !== id);
    setRingGroups(updatedGroups);
    onUpdate({ ...config, ringGroups: updatedGroups });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Manage Ring Groups</h3>
          <p className="text-sm text-gray-500">Configure ring groups for call distribution</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-kennex-600 text-white rounded-md hover:bg-kennex-700"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Create Ring Groups
        </button>
      </div>

      {/* Ring Groups Table - Matching Connex Layout */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ringGroups.map((group) => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {group.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {group.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {group.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {group.ringGroupType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => {
                      const updatedGroups = ringGroups.map(g => 
                        g.id === group.id ? { ...g, enabled: !g.enabled } : g
                      );
                      setRingGroups(updatedGroups);
                      onUpdate({ ...config, ringGroups: updatedGroups });
                    }}
                    className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200"
                    style={{
                      backgroundColor: group.enabled ? '#10B981' : '#D1D5DB'
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        group.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative">
                    <button 
                      onClick={() => handleEdit(group)}
                      className="text-gray-400 hover:text-gray-500 p-1"
                    >
                      •••
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ringGroups.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Ring Groups</h3>
          <p className="text-gray-500">Create ring groups to route calls to multiple extensions</p>
        </div>
      )}

      {/* Create Ring Groups Wizard Modal */}
      {showCreateForm && (
        <ConnexRingGroupWizard
          onSave={handleSave}
          onCancel={() => setShowCreateForm(false)}
          availableExtensions={config.extensions || []}
        />
      )}

      {/* Edit Ring Group Form Modal */}
      {showEditForm && editingGroup && (
        <ConnexRingGroupForm
          group={editingGroup}
          onSave={handleSave}
          onCancel={() => {
            setShowEditForm(false);
            setEditingGroup(null);
          }}
          availableExtensions={config.extensions || []}
        />
      )}
    </div>
  );
};

// Connex Ring Group Creation Wizard - Multi-Step Process
const ConnexRingGroupWizard: React.FC<{
  onSave: (group: ConnexRingGroup) => void;
  onCancel: () => void;
  availableExtensions: any[];
}> = ({ onSave, onCancel, availableExtensions }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ConnexRingGroup>>({
    name: '',
    description: '',
    displayName: '',
    businessHours: '9-5',
    outOfHoursAction: 'Hangup',
    dayClosedAction: 'Hangup',
    ringGroupType: 'Ring In Order',
    extensions: [],
    queues: 'AccountManagers',
    ringTime: 365,
    dropAction: 'Hangup',
    enabled: true
  });

  const steps = [
    { number: 1, name: 'General', description: 'Basic information' },
    { number: 2, name: 'Settings', description: 'Configuration options' },
    { number: 3, name: 'Finish', description: 'Review and create' }
  ];

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinish = () => {
    onSave({
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    } as ConnexRingGroup);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Welcome to the create Ring Groups wizard</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Ring Group Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Ring Group Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name *</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                required
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Hours</label>
                <select
                  value={formData.businessHours}
                  onChange={(e) => setFormData({...formData, businessHours: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                >
                  <option value="9-5">9-5</option>
                  <option value="24 Hours">24 Hours</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">If Out Of Hours</label>
                <select
                  value={formData.outOfHoursAction}
                  onChange={(e) => setFormData({...formData, outOfHoursAction: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                >
                  <option value="Hangup">Hangup</option>
                  <option value="Voicemail">Voicemail</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">If Day Closed</label>
                <select
                  value={formData.dayClosedAction}
                  onChange={(e) => setFormData({...formData, dayClosedAction: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                >
                  <option value="Hangup">Hangup</option>
                  <option value="Voicemail">Voicemail</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Ring Group Type *</label>
                <select
                  value={formData.ringGroupType}
                  onChange={(e) => setFormData({...formData, ringGroupType: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                >
                  <option value="Ring In Order">Ring In Order</option>
                  <option value="Ring All">Ring All</option>
                  <option value="Round Robin">Round Robin</option>
                </select>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">Minimum of two extensions required for ring group</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Extensions</label>
              <select
                multiple
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              >
                {availableExtensions.map(ext => (
                  <option key={ext.id} value={ext.displayName}>
                    {ext.displayName}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ring Time (sec)</label>
                <input
                  type="number"
                  value={formData.ringTime}
                  onChange={(e) => setFormData({...formData, ringTime: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Drop Action</label>
                <select
                  value={formData.dropAction}
                  onChange={(e) => setFormData({...formData, dropAction: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                >
                  <option value="Hangup">Hangup</option>
                  <option value="Send To Queue">Send To Queue</option>
                  <option value="Voicemail">Voicemail</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Review Ring Group Settings</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{formData.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="text-sm text-gray-900">{formData.description}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                  <dd className="text-sm text-gray-900">{formData.displayName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ring Group Type</dt>
                  <dd className="text-sm text-gray-900">{formData.ringGroupType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ring Time</dt>
                  <dd className="text-sm text-gray-900">{formData.ringTime} seconds</dd>
                </div>
              </dl>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Wizard Header */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900">Create Ring Groups</h2>
          
          {/* Step Indicators */}
          <div className="mt-4">
            <div className="flex items-center">
              {steps.map((step, stepIdx) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep === step.number 
                      ? 'bg-kennex-600 text-white' 
                      : currentStep > step.number 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {currentStep > step.number ? '✓' : step.number}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep === step.number ? 'text-kennex-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  {stepIdx < steps.length - 1 && (
                    <div className="w-12 h-px bg-gray-300 mx-4"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Step Content */}
        <div className="mb-6">
          {renderStepContent()}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-kennex-600 text-white rounded-md hover:bg-kennex-700"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Ring Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Connex Ring Group Edit Form - Matching Connex Interface
const ConnexRingGroupForm: React.FC<{
  group: ConnexRingGroup;
  onSave: (group: ConnexRingGroup) => void;
  onCancel: () => void;
  availableExtensions: any[];
}> = ({ group, onSave, onCancel, availableExtensions }) => {
  const [formData, setFormData] = useState<Partial<ConnexRingGroup>>({
    name: group.name,
    description: group.description,
    displayName: group.displayName,
    businessHours: group.businessHours,
    outOfHoursAction: group.outOfHoursAction,
    dayClosedAction: group.dayClosedAction,
    ringGroupType: group.ringGroupType,
    extensions: group.extensions,
    queues: group.queues,
    ringTime: group.ringTime,
    dropAction: group.dropAction,
    enabled: group.enabled
  });

  const [selectedExtensions, setSelectedExtensions] = useState<string[]>(group.extensions || []);

  const handleRemoveExtension = (extensionName: string) => {
    const updated = selectedExtensions.filter(ext => ext !== extensionName);
    setSelectedExtensions(updated);
    setFormData({...formData, extensions: updated});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...group,
      ...formData,
      extensions: selectedExtensions
    } as ConnexRingGroup);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Ring Group</h3>
          <div className="flex space-x-2">
            <button
              type="submit"
              form="ring-group-form"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              ✓ Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ✗
            </button>
          </div>
        </div>
        
        <form id="ring-group-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ring Group Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ring Group Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              required
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Hours</label>
              <select
                value={formData.businessHours}
                onChange={(e) => setFormData({...formData, businessHours: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              >
                <option value="9-5">9-5</option>
                <option value="24 Hours">24 Hours</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">If Out Of Hours</label>
              <select
                value={formData.outOfHoursAction}
                onChange={(e) => setFormData({...formData, outOfHoursAction: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              >
                <option value="Hangup">Hangup</option>
                <option value="Voicemail">Voicemail</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">If Day Closed</label>
              <select
                value={formData.dayClosedAction}
                onChange={(e) => setFormData({...formData, dayClosedAction: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              >
                <option value="Hangup">Hangup</option>
                <option value="Voicemail">Voicemail</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Drop Action</label>
              <select
                value={formData.dropAction}
                onChange={(e) => setFormData({...formData, dropAction: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
              >
                <option value="Send To Queue">Send To Queue</option>
                <option value="Hangup">Hangup</option>
                <option value="Voicemail">Voicemail</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Queues</label>
            <select
              value={formData.queues}
              onChange={(e) => setFormData({...formData, queues: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
            >
              <option value="AccountManagers">AccountManagers</option>
              <option value="Support">Support</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ring Group Type *</label>
            <select
              value={formData.ringGroupType}
              onChange={(e) => setFormData({...formData, ringGroupType: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
            >
              <option value="Ring All">Ring All</option>
              <option value="Ring In Order">Ring In Order</option>
              <option value="Round Robin">Round Robin</option>
            </select>
          </div>

          {/* Extensions Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Extensions</label>
            <div className="space-y-2">
              {selectedExtensions.map((extensionName) => (
                <div key={extensionName} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">{extensionName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExtension(extensionName)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ring Time (sec)</label>
            <input
              type="number"
              value={formData.ringTime}
              onChange={(e) => setFormData({...formData, ringTime: parseInt(e.target.value)})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kennex-500 focus:ring-kennex-500"
            />
          </div>
        </form>
      </div>
    </div>
  );
};