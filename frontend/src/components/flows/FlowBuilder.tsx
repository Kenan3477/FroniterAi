'use client';

import { useState, useCallback, useMemo, DragEvent, useEffect, useRef } from 'react';
import { ArrowLeft, Search, RotateCcw, Undo, Redo, Settings, GitBranch, Save, Cloud, CloudOff } from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  NodeTypes,
  MarkerType,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { flowsAPI, Flow } from '../../services/api';

// Custom Node Components with Handles
const EventTriggerNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-slate-500 text-white rounded-lg shadow-lg border-2 border-slate-600 min-w-[140px] relative">
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 !bg-white !border-2 !border-slate-600"
    />
    <div className="flex items-center space-x-2">
      <span className="text-lg">{data.icon}</span>
      <span className="font-medium text-sm">{data.label}</span>
    </div>
  </div>
);

const ActionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-blue-500 text-white rounded-lg shadow-lg border-2 border-blue-600 min-w-[140px] relative">
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 !bg-white !border-2 !border-blue-600"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 !bg-white !border-2 !border-blue-600"
    />
    <div className="flex items-center space-x-2">
      <span className="text-lg">{data.icon}</span>
      <span className="font-medium text-sm">{data.label}</span>
    </div>
  </div>
);

const ConditionalNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-orange-500 text-white rounded-lg shadow-lg border-2 border-orange-600 min-w-[140px] relative">
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 !bg-white !border-2 !border-orange-600"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 !bg-white !border-2 !border-orange-600"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="yes"
      className="w-3 h-3 !bg-white !border-2 !border-orange-600"
    />
    <div className="flex items-center space-x-2">
      <span className="text-lg">{data.icon}</span>
      <span className="font-medium text-sm">{data.label}</span>
    </div>
  </div>
);

const AINode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-purple-500 text-white rounded-lg shadow-lg border-2 border-purple-600 min-w-[140px] relative">
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 !bg-white !border-2 !border-purple-600"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 !bg-white !border-2 !border-purple-600"
    />
    <div className="flex items-center space-x-2">
      <span className="text-lg">{data.icon}</span>
      <span className="font-medium text-sm">{data.label}</span>
    </div>
  </div>
);

interface FlowBuilderProps {
  onBack: () => void;
  flowName?: string;
}

// Node Configuration Panel Component
function NodeConfigPanel({ node, onClose, onUpdate }: { 
  node: Node; 
  onClose: () => void; 
  onUpdate: (node: Node) => void; 
}) {
  const [nodeData, setNodeData] = useState(node.data || {});

  const updateNodeData = (newData: any) => {
    const updatedData = { ...nodeData, ...newData };
    setNodeData(updatedData);
    onUpdate({ ...node, data: updatedData });
  };

  const renderConfigFields = () => {
    if (node.type === 'eventTrigger') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label (Optional)
            </label>
            <input
              type="text"
              value={nodeData.label || ''}
              onChange={(e) => updateNodeData({ label: e.target.value })}
              placeholder="Flash Inbound"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CLI
            </label>
            <div className="relative">
              <input
                type="text"
                value={nodeData.cli || '448008021320'}
                onChange={(e) => updateNodeData({ cli: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button className="text-gray-400 hover:text-gray-600">✕</button>
                <button className="text-gray-400 hover:text-gray-600">⌄</button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Capture Customer Number</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={nodeData.captureCustomerNumber || false}
                onChange={(e) => updateNodeData({ captureCustomerNumber: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-slate-300 ${
                nodeData.captureCustomerNumber ? 'peer-checked:bg-slate-600' : ''
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  nodeData.captureCustomerNumber ? 'translate-x-5' : 'translate-x-0'
                } absolute top-0.5 left-0.5`}></div>
              </div>
            </label>
          </div>
        </div>
      );
    }

    if (node.type === 'conditional') {
      // Business Hours Check or IVR
      if (nodeData.label === '9-5' || nodeData.subType === 'businessHours') {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                placeholder="9-5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business hours
              </label>
              <select
                value={nodeData.businessHours || '9-5'}
                onChange={(e) => updateNodeData({ businessHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="9-5">9-5</option>
                <option value="24-7">24-7</option>
                <option value="9-6">9-6</option>
                <option value="8-5">8-5</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        );
      } else if (nodeData.label === 'IVR' || nodeData.subType === 'ivr') {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                placeholder="IVR"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enabled Digits
              </label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => {
                      const enabled = nodeData.enabledDigits || [1,2,3,4];
                      const newEnabled = enabled.includes(digit) 
                        ? enabled.filter((d: any) => d !== digit)
                        : [...enabled, digit];
                      updateNodeData({ enabledDigits: newEnabled });
                    }}
                    className={`p-2 text-center border rounded ${
                      (nodeData.enabledDigits || [1,2,3,4]).includes(digit)
                        ? 'bg-slate-600 text-white border-slate-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (Seconds)
              </label>
              <input
                type="number"
                value={nodeData.timeout || 5}
                onChange={(e) => updateNodeData({ timeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audio File
              </label>
              <select
                value={nodeData.audioFile || 'Flash Welcome IVR'}
                onChange={(e) => updateNodeData({ audioFile: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="Flash Welcome IVR">Flash Welcome IVR</option>
                <option value="Main Menu">Main Menu</option>
                <option value="Custom Audio">Custom Audio</option>
              </select>
            </div>
          </div>
        );
      }
    }

    if (node.type === 'action') {
      // Audio playback or external transfer
      if (nodeData.label === 'Flash OOH' || nodeData.subType === 'playAudio') {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                placeholder="Flash OOH"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audio Type
              </label>
              <select
                value={nodeData.audioType || 'Audio File'}
                onChange={(e) => updateNodeData({ audioType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="Audio File">Audio File</option>
                <option value="Text to Speech">Text to Speech</option>
                <option value="Silence">Silence</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audio File
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nodeData.audioFileName || 'No Name OOH New New'}
                  onChange={(e) => updateNodeData({ audioFileName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      } else if (nodeData.label === 'YourGoTo' || nodeData.subType === 'externalTransfer') {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                placeholder="YourGoTo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DDI
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nodeData.ddi || '7+442080501954'}
                  onChange={(e) => updateNodeData({ ddi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  🔄
                </button>
              </div>
            </div>
          </div>
        );
      } else if (nodeData.label === 'Customer Services' || nodeData.subType === 'queueTransfer') {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                value={nodeData.label || ''}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                placeholder="Customer Services"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inbound Queue
              </label>
              <div className="relative">
                <select
                  value={nodeData.inboundQueue || 'CustomerServices'}
                  onChange={(e) => updateNodeData({ inboundQueue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="CustomerServices">CustomerServices</option>
                  <option value="Sales">Sales</option>
                  <option value="Support">Support</option>
                  <option value="Billing">Billing</option>
                </select>
                <button className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    // Default config for other node types
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={nodeData.label || ''}
            onChange={(e) => updateNodeData({ label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Configure Node</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ←
          </button>
        </div>
        <p className="text-sm text-gray-500">{nodeData.label || 'Untitled Node'}</p>
      </div>

      {/* Configuration Fields */}
      <div className="flex-1 p-4">
        {renderConfigFields()}
      </div>
    </div>
  );
}

function FlowBuilderContent({ onBack, flowName = "Flash Inbound" }: FlowBuilderProps) {
  const [selectedNodeCategory, setSelectedNodeCategory] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Date>(new Date());

  // React Flow state
  const initialNodes: Node[] = [
    {
      id: 'start',
      type: 'eventTrigger',
      position: { x: 300, y: 100 },
      data: { 
        label: 'Flash Inbound', 
        icon: '📞',
        cli: '448008021320',
        captureCustomerNumber: false
      },
      draggable: true,
    },
    {
      id: 'business-hours',
      type: 'conditional',
      position: { x: 300, y: 250 },
      data: { 
        label: '9-5', 
        icon: '🕘',
        subType: 'businessHours',
        businessHours: '9-5'
      },
      draggable: true,
    },
    {
      id: 'flash-ooh',
      type: 'action',
      position: { x: 100, y: 400 },
      data: { 
        label: 'Flash OOH', 
        icon: '🔊',
        subType: 'playAudio',
        audioType: 'Audio File',
        audioFileName: 'No Name OOH New New'
      },
      draggable: true,
    },
    {
      id: 'ivr',
      type: 'conditional',
      position: { x: 500, y: 400 },
      data: { 
        label: 'IVR', 
        icon: '🔀',
        subType: 'ivr',
        enabledDigits: [1,2,3,4],
        timeout: 5,
        audioFile: 'Flash Welcome IVR'
      },
      draggable: true,
    },
    {
      id: 'yourgoto',
      type: 'action',
      position: { x: 350, y: 550 },
      data: { 
        label: 'YourGoTo', 
        icon: '📞',
        subType: 'externalTransfer',
        ddi: '7+442080501954'
      },
      draggable: true,
    },
    {
      id: 'customer-services',
      type: 'action',
      position: { x: 650, y: 550 },
      data: { 
        label: 'Customer Services', 
        icon: '🎧',
        subType: 'queueTransfer',
        inboundQueue: 'CustomerServices'
      },
      draggable: true,
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: 'start',
      target: 'business-hours',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#6b7280' },
    },
    {
      id: 'e2-3-ooh',
      source: 'business-hours',
      target: 'flash-ooh',
      label: 'Outside Hours',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#ef4444' },
    },
    {
      id: 'e2-4-within',
      source: 'business-hours',
      target: 'ivr',
      label: 'Within Hours',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#22c55e' },
    },
    {
      id: 'e4-5-option1',
      source: 'ivr',
      target: 'yourgoto',
      label: 'Option 1',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#3b82f6' },
    },
    {
      id: 'e4-6-option2',
      source: 'ivr',
      target: 'customer-services',
      label: 'Option 2',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#8b5cf6' },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      eventTrigger: EventTriggerNode,
      action: ActionNode,
      conditional: ConditionalNode,
      ai: AINode,
    }),
    []
  );

  // Auto-save functionality
  const saveFlow = useCallback(async () => {
    if (!currentFlowId) return;

    try {
      setSaveStatus('saving');
      
      // Convert ReactFlow nodes/edges to our API format
      const flowNodes = nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data
      }));

      const flowEdges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }));

      // Update flow with current state
      await flowsAPI.updateFlow(currentFlowId, {
        name: flowName
      });

      // Note: In a real implementation, you'd save the nodes and edges 
      // to a flow version. For now, we're just updating the flow metadata.
      
      lastSaveRef.current = new Date();
      setSaveStatus('saved');
      console.log('Flow auto-saved successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('unsaved');
    }
  }, [currentFlowId, nodes, edges, flowName]);

  // Debounced auto-save when nodes or edges change
  useEffect(() => {
    if (!currentFlowId) return;

    setSaveStatus('unsaved');
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds delay)
    saveTimeoutRef.current = setTimeout(() => {
      saveFlow();
    }, 2000);

    // Cleanup timeout on component unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, saveFlow, currentFlowId]);

  // Manual save function
  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveFlow();
  }, [saveFlow]);

  // Initialize flow ID (in a real app, this would come from props or routing)
  useEffect(() => {
    // For demo purposes, create a mock flow ID or get from current flow
    const mockFlowId = 'demo-flow-' + Date.now();
    setCurrentFlowId(mockFlowId);
  }, []);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: '#6b7280' }
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedNodeCategory(null); // Close node palette when selecting a node
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null); // Deselect node when clicking on empty canvas
  }, []);

  // Node palette data
  const nodeCategories = [
    {
      id: 'event-triggers',
      title: 'Event Triggers',
      nodes: [
        { id: 'phone', icon: '📞', name: 'Phone Call', type: 'eventTrigger' },
        { id: 'apple', icon: '🍎', name: 'Apple Messages', type: 'eventTrigger' },
        { id: 'whatsapp', icon: '💬', name: 'WhatsApp', type: 'eventTrigger' },
        { id: 'sms', icon: '💬', name: 'SMS', type: 'eventTrigger' },
        { id: 'email', icon: '📧', name: 'Email', type: 'eventTrigger' },
        { id: 'webhook', icon: '🔗', name: 'Webhook', type: 'eventTrigger' },
        { id: 'schedule', icon: '⏰', name: 'Schedule', type: 'eventTrigger' },
        { id: 'form', icon: '📝', name: 'Form', type: 'eventTrigger' },
      ]
    },
    {
      id: 'bulk-automations',
      title: 'Bulk Automations',
      nodes: [
        { id: 'bulk-sms', icon: '👥', name: 'Bulk SMS', type: 'action' },
        { id: 'bulk-email', icon: '📧', name: 'Bulk Email', type: 'action' },
      ]
    },
    {
      id: 'conditionals',
      title: 'Conditionals',
      nodes: [
        { id: 'if-then', icon: '🔀', name: 'If/Then', type: 'conditional' },
        { id: 'switch', icon: '🔄', name: 'Switch', type: 'conditional' },
        { id: 'filter', icon: '🔍', name: 'Filter', type: 'conditional' },
        { id: 'compare', icon: '⚖️', name: 'Compare', type: 'conditional' },
        { id: 'time-condition', icon: '⏰', name: 'Time', type: 'conditional' },
      ]
    },
    {
      id: 'hive-ai',
      title: 'HIVE AI',
      nodes: [
        { id: 'ai-chat', icon: '🤖', name: 'AI Chat', type: 'ai' },
        { id: 'ai-classify', icon: '🧠', name: 'Classify', type: 'ai' },
        { id: 'ai-sentiment', icon: '😊', name: 'Sentiment', type: 'ai' },
        { id: 'ai-translate', icon: '🌐', name: 'Translate', type: 'ai' },
        { id: 'ai-summarize', icon: '📝', name: 'Summarize', type: 'ai' },
      ]
    },
    {
      id: 'actions',
      title: 'Actions',
      nodes: [
        { id: 'send-sms', icon: '📱', name: 'Send SMS', type: 'action' },
        { id: 'play-audio', icon: '🔊', name: 'Play Audio', type: 'action' },
        { id: 'transfer', icon: '📞', name: 'Transfer', type: 'action' },
        { id: 'record', icon: '📹', name: 'Record', type: 'action' },
        { id: 'voicemail', icon: '📞', name: 'Voicemail', type: 'action' },
        { id: 'hang-up', icon: '📞', name: 'Hang Up', type: 'action' },
        { id: 'call-api', icon: '🔌', name: 'Call API', type: 'action' },
        { id: 'send-email', icon: '📧', name: 'Send Email', type: 'action' },
        { id: 'update-crm', icon: '📊', name: 'Update CRM', type: 'action' },
      ]
    }
  ];

  // Drag and drop functionality
  const onDragStart = (event: DragEvent, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const nodeDataString = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeDataString) return;

      const nodeData = JSON.parse(nodeDataString);
      const position = {
        x: event.clientX - reactFlowBounds.left - 70,
        y: event.clientY - reactFlowBounds.top - 20,
      };

      const newNode: Node = {
        id: `${nodeData.id}-${Date.now()}`,
        type: nodeData.type,
        position,
        data: { label: nodeData.name, icon: nodeData.icon },
        draggable: true,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-slate-100 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="font-medium">Flow</span>
            </button>
            
            {/* Save Status Indicator */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleManualSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-800 disabled:bg-slate-800 rounded transition-colors"
                title="Save now"
              >
                <Save size={12} />
                <span>Save</span>
              </button>
              
              <div className="flex items-center space-x-1 text-xs">
                {saveStatus === 'saved' && (
                  <>
                    <Cloud size={12} className="text-slate-200" />
                    <span className="text-slate-200">Saved</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-200">Saving...</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <CloudOff size={12} className="text-yellow-300" />
                    <span className="text-yellow-300">Unsaved</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <h2 className="text-lg font-medium">{flowName}</h2>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Components..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            />
          </div>
        </div>

        {/* Content based on selection */}
        <div className="flex-1 overflow-y-auto">
          {selectedNode ? (
            /* Node Configuration Panel */
            <NodeConfigPanel 
              node={selectedNode} 
              onClose={() => setSelectedNode(null)}
              onUpdate={(updatedNode) => {
                setNodes((nds) => nds.map((n) => n.id === updatedNode.id ? updatedNode : n));
                setSelectedNode(updatedNode);
              }}
            />
          ) : (
            /* Node Palette */
            <div>
              {nodeCategories.map((category) => (
                <div key={category.id} className="border-b border-gray-200">
              <button
                onClick={() => setSelectedNodeCategory(
                  selectedNodeCategory === category.id ? null : category.id
                )}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{category.title}</span>
                <span className="text-gray-400">
                  {selectedNodeCategory === category.id ? '▼' : '▶'}
                </span>
              </button>
              
              {selectedNodeCategory === category.id && (
                <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50">
                  {category.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex flex-col items-center p-2 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-slate-300 hover:shadow-sm transition-all"
                      draggable
                      onDragStart={(event) => onDragStart(event, node)}
                      title={`Drag to add ${node.name}`}
                    >
                      <div className="text-2xl mb-1">{node.icon}</div>
                      <div className="text-xs text-gray-600 text-center leading-tight">
                        {node.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-medium text-gray-900">{flowName}</h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* Zoom and Tools */}
            <div className="flex items-center space-x-2">
              <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
                <RotateCcw size={18} />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
                <Undo size={18} />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
                <Redo size={18} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
                <Settings size={18} />
              </button>
            </div>

            {/* Deploy Button */}
            <button className="px-4 py-2 bg-slate-600 text-white rounded-full text-sm font-medium hover:bg-slate-700 transition-colors">
              Deploy
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            fitView
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={true}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            style={{ height: '100%', width: '100%' }}
          >
            <Background 
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#d1d5db"
            />
            <Controls 
              position="bottom-left"
              showInteractive={false}
            />
            <MiniMap
              position="bottom-right"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'eventTrigger': return '#10b981';
                  case 'action': return '#3b82f6';
                  case 'conditional': return '#f97316';
                  case 'ai': return '#8b5cf6';
                  default: return '#6b7280';
                }
              }}
              maskColor="rgb(240, 242, 246, 0.7)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent {...props} />
    </ReactFlowProvider>
  );
}