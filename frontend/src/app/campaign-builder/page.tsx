'use client';

import { useState, useCallback, useRef } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon, 
  PauseIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  PhoneIcon,
  ClockIcon,
  EnvelopeIcon,
  ChatBubbleBottomCenterTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface CampaignNode {
  id: string;
  type: 'start' | 'call' | 'wait' | 'email' | 'sms' | 'condition' | 'end';
  x: number;
  y: number;
  data: {
    title: string;
    subtitle?: string;
    config?: any;
  };
  connections: string[];
}

interface Connection {
  from: string;
  to: string;
  label?: string;
}

export default function CampaignBuilderPage() {
  const [nodes, setNodes] = useState<CampaignNode[]>([
    {
      id: 'start',
      type: 'start',
      x: 100,
      y: 100,
      data: { title: 'Campaign Start' },
      connections: []
    }
  ]);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragOffset: { x: number; y: number };
    nodeId: string | null;
  }>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    nodeId: null
  });
  
  const [campaignSettings, setCampaignSettings] = useState({
    name: 'New Campaign',
    description: '',
    abTestEnabled: false,
    abTestSplit: 50,
    priority: 'normal',
    timezone: 'UTC',
    businessHours: {
      start: '09:00',
      end: '17:00',
      days: ['mon', 'tue', 'wed', 'thu', 'fri']
    }
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeTypes = [
    { type: 'call', icon: PhoneIcon, label: 'Phone Call', color: 'bg-blue-500' },
    { type: 'wait', icon: ClockIcon, label: 'Wait/Delay', color: 'bg-yellow-500' },
    { type: 'email', icon: EnvelopeIcon, label: 'Email', color: 'bg-green-500' },
    { type: 'sms', icon: ChatBubbleBottomCenterTextIcon, label: 'SMS', color: 'bg-purple-500' },
    { type: 'condition', icon: ExclamationTriangleIcon, label: 'Condition', color: 'bg-orange-500' },
    { type: 'end', icon: CheckCircleIcon, label: 'End Campaign', color: 'bg-red-500' }
  ];

  const getNodeIcon = (type: string) => {
    const nodeType = nodeTypes.find(nt => nt.type === type);
    return nodeType?.icon || PhoneIcon;
  };

  const getNodeColor = (type: string) => {
    const nodeType = nodeTypes.find(nt => nt.type === type);
    return nodeType?.color || 'bg-gray-500';
  };

  const addNode = useCallback((type: string, x: number = 300, y: number = 200) => {
    const newNode: CampaignNode = {
      id: `node_${Date.now()}`,
      type: type as any,
      x,
      y,
      data: {
        title: nodeTypes.find(nt => nt.type === type)?.label || 'New Node',
        subtitle: type === 'call' ? 'Make phone call' : 
                 type === 'wait' ? 'Wait 1 hour' :
                 type === 'email' ? 'Send email' :
                 type === 'sms' ? 'Send SMS' :
                 type === 'condition' ? 'Check condition' :
                 'End campaign'
      },
      connections: []
    };

    setNodes(prev => [...prev, newNode]);
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'start') return;
    
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, x, y } : node
    ));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDragState({
      isDragging: true,
      dragOffset: {
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y
      },
      nodeId
    });
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.nodeId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = e.clientX - rect.left - dragState.dragOffset.x;
    const newY = e.clientY - rect.top - dragState.dragOffset.y;

    updateNodePosition(dragState.nodeId, Math.max(0, newX), Math.max(0, newY));
  }, [dragState, updateNodePosition]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      nodeId: null
    });
  }, []);

  const connectNodes = useCallback((fromId: string, toId: string) => {
    const existingConnection = connections.find(conn => 
      conn.from === fromId && conn.to === toId
    );
    
    if (!existingConnection && fromId !== toId) {
      setConnections(prev => [...prev, { from: fromId, to: toId }]);
    }
  }, [connections]);

  const NodeComponent = ({ node }: { node: CampaignNode }) => {
    const IconComponent = getNodeIcon(node.type);
    const isSelected = selectedNode === node.id;
    
    return (
      <div
        className={`absolute cursor-move select-none ${isSelected ? 'z-20' : 'z-10'}`}
        style={{ left: node.x, top: node.y }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onClick={() => setSelectedNode(node.id)}
      >
        <div className={`
          bg-white border-2 rounded-lg p-4 min-w-[150px] shadow-lg
          ${isSelected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'}
          hover:border-gray-300 transition-all duration-200
        `}>
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-2 rounded-full text-white ${getNodeColor(node.type)}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{node.data.title}</div>
              {node.data.subtitle && (
                <div className="text-xs text-gray-500">{node.data.subtitle}</div>
              )}
            </div>
          </div>
          
          {/* Connection points */}
          <div className="flex justify-between">
            <div className="w-3 h-3 bg-gray-300 rounded-full -ml-6 mt-1"></div>
            <div className="w-3 h-3 bg-gray-300 rounded-full -mr-6 mt-1"></div>
          </div>
        </div>
      </div>
    );
  };

  const renderConnections = () => {
    return connections.map((conn, index) => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      
      if (!fromNode || !toNode) return null;

      const startX = fromNode.x + 150;
      const startY = fromNode.y + 40;
      const endX = toNode.x;
      const endY = toNode.y + 40;

      return (
        <svg
          key={index}
          className="absolute inset-0 pointer-events-none z-0"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6B7280"
              />
            </marker>
          </defs>
          <path
            d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${startY - 50} ${endX} ${endY}`}
            stroke="#6B7280"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
        </svg>
      );
    });
  };

  const NodePropertiesPanel = () => {
    const node = nodes.find(n => n.id === selectedNode);
    if (!node || node.type === 'start') return null;

    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Node Properties</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={node.data.title}
              onChange={(e) => {
                setNodes(prev => prev.map(n => 
                  n.id === node.id 
                    ? { ...n, data: { ...n.data, title: e.target.value } }
                    : n
                ));
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={node.data.subtitle || ''}
              onChange={(e) => {
                setNodes(prev => prev.map(n => 
                  n.id === node.id 
                    ? { ...n, data: { ...n.data, subtitle: e.target.value } }
                    : n
                ));
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>

          {node.type === 'call' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Script</label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>Default Sales Script</option>
                  <option>Follow-up Script</option>
                  <option>Cold Call Script</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Attempts</label>
                <input type="number" defaultValue="3" className="w-full p-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Retry Delay (hours)</label>
                <input type="number" defaultValue="24" className="w-full p-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          )}

          {node.type === 'wait' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Wait Duration</label>
                <div className="flex space-x-2">
                  <input type="number" defaultValue="1" className="flex-1 p-2 border border-gray-300 rounded-md" />
                  <select className="p-2 border border-gray-300 rounded-md">
                    <option>Hours</option>
                    <option>Days</option>
                    <option>Weeks</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="businessHours" className="mr-2" />
                <label htmlFor="businessHours" className="text-sm">Respect business hours</label>
              </div>
            </div>
          )}

          {node.type === 'email' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email Template</label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>Welcome Email</option>
                  <option>Follow-up Email</option>
                  <option>Promotional Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Send From</label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>sales@company.com</option>
                  <option>support@company.com</option>
                </select>
              </div>
            </div>
          )}

          {node.type === 'condition' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Condition Type</label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>Call Result</option>
                  <option>Contact Property</option>
                  <option>Time-based</option>
                  <option>Custom Field</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Operator</label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>Equals</option>
                  <option>Not Equals</option>
                  <option>Greater Than</option>
                  <option>Less Than</option>
                  <option>Contains</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input type="text" className="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter value..." />
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <button
              onClick={() => deleteNode(node.id)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete Node</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Campaign Builder</h1>
              <input
                type="text"
                value={campaignSettings.name}
                onChange={(e) => setCampaignSettings(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-1 border border-gray-300 rounded-md text-lg font-medium"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                <DocumentDuplicateIcon className="w-4 h-4" />
                <span>Save as Template</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                <ChartBarIcon className="w-4 h-4" />
                <span>A/B Test</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <PlayIcon className="w-4 h-4" />
                <span>Start Campaign</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Toolbar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Campaign Elements</h3>
            <div className="space-y-2">
              {nodeTypes.map((nodeType) => {
                const IconComponent = nodeType.icon;
                return (
                  <button
                    key={nodeType.type}
                    onClick={() => addNode(nodeType.type)}
                    className="w-full flex items-center space-x-3 p-3 text-left bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-full text-white ${nodeType.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{nodeType.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Campaign Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    value={campaignSettings.priority}
                    onChange={(e) => setCampaignSettings(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
                  <select 
                    value={campaignSettings.timezone}
                    onChange={(e) => setCampaignSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                    <option value="CST">Central Time</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="abTest" 
                    checked={campaignSettings.abTestEnabled}
                    onChange={(e) => setCampaignSettings(prev => ({ ...prev, abTestEnabled: e.target.checked }))}
                    className="mr-2" 
                  />
                  <label htmlFor="abTest" className="text-xs font-medium text-gray-700">Enable A/B Testing</label>
                </div>

                {campaignSettings.abTestEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Test Split %</label>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={campaignSettings.abTestSplit}
                      onChange={(e) => setCampaignSettings(prev => ({ ...prev, abTestSplit: parseInt(e.target.value) }))}
                      className="w-full" 
                    />
                    <div className="text-xs text-gray-500 text-center">{campaignSettings.abTestSplit}% / {100 - campaignSettings.abTestSplit}%</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <div
              ref={canvasRef}
              className="w-full h-full bg-gray-50 relative overflow-auto cursor-default"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              {renderConnections()}
              {nodes.map((node) => (
                <NodeComponent key={node.id} node={node} />
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedNode && <NodePropertiesPanel />}
        </div>
      </div>
    </MainLayout>
  );
};