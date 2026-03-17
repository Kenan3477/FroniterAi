'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Settings, BarChart3, List, GitBranch, Calendar, User, Trash2, Rocket, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import FlowBuilder from './FlowBuilder';
import { flowsAPI, Flow } from '../../services/api';

interface FlowsManagementProps {
  onBackToAdmin: () => void;
  initialSubSection?: string;
}

export default function FlowsManagement({ onBackToAdmin, initialSubSection = 'Manage Flows' }: FlowsManagementProps) {
  const [selectedSubSection, setSelectedSubSection] = useState(initialSubSection);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [currentFlowName, setCurrentFlowName] = useState('');
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsFlow, setSettingsFlow] = useState<Flow | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const flowSubSections = [
    { id: 'back', name: 'Back to Admin', icon: ArrowLeft, action: () => onBackToAdmin() },
    { 
      id: 'manage', 
      name: 'Manage Flows', 
      icon: List,
      isCollapsible: true,
      subItems: [
        { id: 'manage-flows', name: 'All Flows', action: () => setSelectedSubSection('Manage Flows') },
        { id: 'create-flow', name: 'Create New Flow', action: () => setShowCreateWizard(true) },
      ]
    },
    { 
      id: 'summaries', 
      name: 'Automation Flow Summaries', 
      icon: BarChart3,
      isCollapsible: true,
      subItems: [
        { id: 'analytics', name: 'Analytics Dashboard', action: () => setSelectedSubSection('Automation Flow Summaries') },
        { id: 'performance', name: 'Performance Reports', action: () => {} },
      ]
    },
  ];

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  if (showFlowBuilder) {
    return (
      <FlowBuilder 
        onBack={() => {
          setShowFlowBuilder(false);
          setEditingFlow(null);
        }} 
        flowName={editingFlow ? editingFlow.name : currentFlowName}
      />
    );
  }

  if (showCreateWizard) {
    return (
      <CreateFlowWizard 
        onBack={() => setShowCreateWizard(false)}
        onFlowCreated={(flowName) => {
          setCurrentFlowName(flowName);
          setShowCreateWizard(false);
          setShowFlowBuilder(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-600 text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-500">
          <div className="flex items-center space-x-2">
            <GitBranch size={20} />
            <span className="font-medium">Flows</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2">
          {flowSubSections.map((section) => {
            const Icon = section.icon;
            const isSelected = section.id === 'manage' && selectedSubSection === 'Manage Flows';
            const isCollapsed = collapsedSections.has(section.id);
            
            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={section.isCollapsible ? () => toggleSection(section.id) : (section.action || (() => setSelectedSubSection(section.name)))}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-100 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={16} />
                    <span className="text-sm">{section.name}</span>
                  </div>
                  {section.isCollapsible && (
                    <div className="ml-2">
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                  )}
                </button>
                
                {/* Sub-items */}
                {section.subItems && !isCollapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={subItem.action}
                        className="w-full text-left px-3 py-1 text-sm text-slate-200 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                      >
                        {subItem.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white">
        {selectedSubSection === 'Manage Flows' && (
          <FlowsList 
            onCreateFlow={() => setShowCreateWizard(true)}
            onEditFlow={(flow) => {
              setEditingFlow(flow);
              setShowFlowBuilder(true);
            }}
            onSettings={(flow) => {
              setSettingsFlow(flow);
              setShowSettings(true);
            }}
          />
        )}
        {selectedSubSection === 'Automation Flow Summaries' && <FlowSummaries />}
        
        {/* Settings Modal */}
        {showSettings && settingsFlow && (
          <FlowSettingsModal
            flow={settingsFlow}
            onClose={() => {
              setShowSettings(false);
              setSettingsFlow(null);
            }}
            onSave={(updatedFlow) => {
              setShowSettings(false);
              setSettingsFlow(null);
              // Optionally refresh the flows list
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateFlowWizard({ onBack, onFlowCreated }: { onBack: () => void; onFlowCreated: (flowName: string) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    flowName: '',
    description: ''
  });

  const handleNext = () => {
    if (currentStep === 1 && formData.flowName && formData.description) {
      setCurrentStep(2);
    }
  };

  const handleCreate = async () => {
    try {
      const newFlow = await flowsAPI.createFlow({
        name: formData.flowName,
        description: formData.description
      });
      console.log('Flow created successfully:', newFlow);
      // After creation, redirect to flow builder
      onFlowCreated(formData.flowName);
    } catch (error) {
      console.error('Error creating flow:', error);
      alert('Failed to create flow. Please try again.');
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-600 text-white">
        <div className="p-4 border-b border-slate-500">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-100 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Create Flow</span>
          </button>
        </div>

        {/* Step indicator */}
        <div className="p-4">
          <div className="space-y-3">
            <div className={`flex items-center space-x-3 ${currentStep >= 1 ? 'text-white' : 'text-slate-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep >= 1 ? 'bg-white text-slate-600' : 'bg-slate-500'
              }`}>
                1
              </div>
              <span className="text-sm">General</span>
            </div>
            <div className={`flex items-center space-x-3 ${currentStep >= 2 ? 'text-white' : 'text-slate-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep >= 2 ? 'bg-white text-slate-600' : 'bg-slate-500'
              }`}>
                2
              </div>
              <span className="text-sm">Finish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          {currentStep === 1 && (
            <div className="text-center">
              {/* Wizard illustration */}
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                    <GitBranch size={32} className="text-indigo-600" />
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the create Flow wizard</h1>
              
              <div className="space-y-4 mt-8">
                <div>
                  <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                    Flow Name *
                  </label>
                  <input
                    type="text"
                    value={formData.flowName}
                    onChange={(e) => setFormData({ ...formData, flowName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-slate-500 focus:ring-slate-500 focus:outline-none"
                    placeholder="Enter flow name"
                  />
                </div>

                <div>
                  <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-slate-500 focus:ring-slate-500 focus:outline-none resize-none"
                    placeholder="Enter flow description"
                  />
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleNext}
                    disabled={!formData.flowName || !formData.description}
                    className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Finish</h1>
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="font-medium text-gray-900 mb-2">Flow Summary</h3>
                <div className="text-left space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {formData.flowName}
                  </div>
                  <div>
                    <span className="font-medium">Description:</span> {formData.description}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                >
                  Create Flow
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowsList({ onCreateFlow, onEditFlow, onSettings }: { 
  onCreateFlow?: () => void; 
  onEditFlow?: (flow: Flow) => void;
  onSettings?: (flow: Flow) => void;
}) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingFlow, setDeletingFlow] = useState<string | null>(null);
  const [deployingFlow, setDeployingFlow] = useState<string | null>(null);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const flowsData = await flowsAPI.getFlows();
      setFlows(flowsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch flows:', err);
      setError('Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleDeployFlow = async (flow: Flow) => {
    const isActive = flow.status === 'ACTIVE';
    const action = isActive ? 'deactivate' : 'deploy';
    const confirmMessage = isActive
      ? `Are you sure you want to deactivate "${flow.name}"? This will stop the flow from processing new events.`
      : `Are you sure you want to deploy "${flow.name}"? This will make the flow active and ready to process events.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeployingFlow(flow.id);
      
      if (isActive) {
        // Deactivate flow by updating status
        await flowsAPI.updateFlow(flow.id, { status: 'INACTIVE' });
        console.log(`Flow "${flow.name}" deactivated successfully`);
      } else {
        // Deploy flow (this would call a deploy endpoint)
        // For now, we'll update the status to ACTIVE
        await flowsAPI.updateFlow(flow.id, { status: 'ACTIVE' });
        console.log(`Flow "${flow.name}" deployed successfully`);
      }
      
      // Refresh flows list
      fetchFlows();
    } catch (err) {
      console.error(`Failed to ${action} flow:`, err);
      alert(`Failed to ${action} flow "${flow.name}". Please try again.`);
    } finally {
      setDeployingFlow(null);
    }
  };

  const handleDeleteFlow = async (flow: Flow) => {
    const isDeployed = flow.status === 'ACTIVE';
    const confirmMessage = isDeployed 
      ? `Are you sure you want to delete "${flow.name}"? This flow is currently deployed and active. This action cannot be undone.`
      : `Are you sure you want to delete "${flow.name}"? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingFlow(flow.id);
      await flowsAPI.deleteFlow(flow.id);
      
      // Update local state to remove the deleted flow
      setFlows(prevFlows => prevFlows.filter(f => f.id !== flow.id));
      
      // Show success message (you could add toast notification here)
      console.log(`Flow "${flow.name}" deleted successfully`);
    } catch (err) {
      console.error('Failed to delete flow:', err);
      alert(`Failed to delete flow "${flow.name}". Please try again.`);
    } finally {
      setDeletingFlow(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Flows</h1>
          <p className="text-gray-600 mt-1">Create and manage your automation flows</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Flows</h1>
          <p className="text-gray-600 mt-1">Create and manage your automation flows</p>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <GitBranch size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading flows</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Flows</h1>
          <p className="text-gray-600 mt-1">Create and manage your automation flows</p>
        </div>
        <button 
          onClick={onCreateFlow}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Create Flow</span>
        </button>
      </div>

      {flows.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <GitBranch size={24} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No flows created yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first automation flow</p>
          <button 
            onClick={onCreateFlow}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            Create Your First Flow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => (
            <div key={flow.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{flow.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{flow.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  flow.status === 'ACTIVE' ? 'bg-green-100 text-slate-800' :
                  flow.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {flow.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <GitBranch size={14} />
                  <span>v{flow.latestVersionNumber}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{new Date(flow.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => onEditFlow?.(flow)}
                  className="flex-1 px-3 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-700 transition-colors"
                >
                  Edit Flow
                </button>
                
                <button 
                  onClick={() => handleDeployFlow(flow)}
                  disabled={deployingFlow === flow.id}
                  className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-center ${
                    deployingFlow === flow.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : flow.status === 'ACTIVE'
                      ? 'border border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400'
                      : 'border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                  title={flow.status === 'ACTIVE' ? 'Deactivate flow' : 'Deploy flow'}
                >
                  {deployingFlow === flow.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : flow.status === 'ACTIVE' ? (
                    <Pause size={14} />
                  ) : (
                    <Rocket size={14} />
                  )}
                </button>

                <button 
                  onClick={() => onSettings?.(flow)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} />
                </button>
                
                <button 
                  onClick={() => handleDeleteFlow(flow)}
                  disabled={deletingFlow === flow.id}
                  className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-center ${
                    deletingFlow === flow.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
                  }`}
                  title={flow.status === 'ACTIVE' ? 'Delete active flow (requires confirmation)' : 'Delete flow'}
                >
                  {deletingFlow === flow.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowSummaries() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automation Flow Summaries</h1>
        <p className="text-gray-600 mt-1">View analytics and performance metrics for your flows</p>
      </div>

      {/* Placeholder content */}
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <BarChart3 size={24} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No flow data available</h3>
        <p className="text-gray-500">Create and run some flows to see analytics here</p>
      </div>
    </div>
  );
}

function FlowSettingsModal({ flow, onClose, onSave }: { 
  flow: Flow; 
  onClose: () => void; 
  onSave: (flow: Flow) => void; 
}) {
  const [formData, setFormData] = useState({
    name: flow.name,
    description: flow.description || '',
    status: flow.status
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedFlow = await flowsAPI.updateFlow(flow.id, formData);
      onSave(updatedFlow);
    } catch (error) {
      console.error('Failed to update flow:', error);
      alert('Failed to update flow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Flow Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flow Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Enter flow name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={3}
              placeholder="Enter flow description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Flow['status'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}