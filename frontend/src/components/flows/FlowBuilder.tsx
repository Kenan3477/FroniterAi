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
  <div className="px-4 py-3 bg-slate-500 tex        { id: 'hangup', icon: '📵', name: 'End Call', type: 'hangup', description: 'Gracefully terminate call' }
      ]
    }
  ];

  // Drag and drop functionality
  const onDragStart = (event: DragEvent, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };hadow-lg border-2 border-slate-600 min-w-[140px] relative">
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
function NodeConfigPanel({ node, onClose, onUpdate, flowId, allNodes, onNodeSelect }: { 
  node: Node; 
  onClose: () => void; 
  onUpdate: (node: Node) => void;
  flowId: string | null;
  allNodes: Node[];
  onNodeSelect: (node: Node) => void;
}) {
  const [nodeData, setNodeData] = useState(node.data || {});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateNodeData = async (newData: any) => {
    const updatedData = { ...nodeData, ...newData };
    setNodeData(updatedData);
    onUpdate({ ...node, data: updatedData });

    // Auto-save to backend if flowId is available
    if (flowId) {
      setSaveStatus('saving');
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await flowsAPI.updateFlowNode(flowId, 'draft', node.id, {
            config: updatedData,
          });
          setSaveStatus('saved');
        } catch (error) {
          console.error('Failed to save node configuration:', error);
          setSaveStatus('error');
        }
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
      {/* Header with Node Selector */}
      <div className="p-4 border-b border-gray-200">
        {/* Node Selector Dropdown */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select Node to Configure
          </label>
          <select
            value={node.id}
            onChange={(e) => {
              const selectedNode = allNodes.find(n => n.id === e.target.value);
              if (selectedNode) onNodeSelect(selectedNode);
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          >
            {allNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.data.icon || '📄'} {n.data.label || n.type || 'Unnamed Node'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-gray-900">Configure Node</h3>
            {flowId && (
              <div className="flex items-center space-x-1 text-xs">
                {saveStatus === 'saved' && (
                  <>
                    <Cloud size={12} className="text-green-500" />
                    <span className="text-green-500">Saved</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500">Saving...</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <CloudOff size={12} className="text-red-500" />
                    <span className="text-red-500">Error</span>
                  </>
                )}
              </div>
            )}
          </div>
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

  // Validation state
  const [validationStatus, setValidationStatus] = useState<'unvalidated' | 'validating' | 'valid' | 'invalid'>('unvalidated');
  const [validationResults, setValidationResults] = useState<{
    errors: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING'; nodeId?: string }>;
    warnings: Array<{ code: string; message: string; nodeId?: string }>;
    summary?: {
      totalNodes: number;
      totalEdges: number;
      entryNodes: number;
      exitNodes: number;
      errorCount: number;
      warningCount: number;
    };
  } | null>(null);

  // Simulation state
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [simulationResults, setSimulationResults] = useState<{
    executionPath: Array<{
      nodeId: string;
      nodeType: string;
      nodeLabel: string;
      action: string;
      result: string;
      duration: number;
      nextNodeId?: string;
    }>;
    summary: {
      totalSteps: number;
      totalDuration: number;
      finalOutcome: string;
      successful: boolean;
    };
  } | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('default');

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

  // Validate flow function
  const validateFlowDesign = useCallback(async () => {
    if (!currentFlowId) {
      console.warn('Cannot validate flow: No flow ID');
      return;
    }

    setValidationStatus('validating');

    try {
      const result = await flowsAPI.validateFlow(currentFlowId);
      
      setValidationResults({
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary
      });

      setValidationStatus(result.isValid ? 'valid' : 'invalid');
      
      console.log('Flow validation completed:', {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

    } catch (error) {
      console.error('Flow validation failed:', error);
      setValidationStatus('invalid');
      setValidationResults({
        errors: [{
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate flow. Please try again.',
          severity: 'ERROR'
        }],
        warnings: []
      });
    }
  }, [currentFlowId]);

  // Auto-validate when flow structure changes
  useEffect(() => {
    if (!currentFlowId || nodes.length === 0) return;

    // Reset validation status when flow changes
    setValidationStatus('unvalidated');
    setValidationResults(null);

    // Debounced validation (5 seconds after changes)
    const validationTimeout = setTimeout(() => {
      validateFlowDesign();
    }, 5000);

    return () => clearTimeout(validationTimeout);
  }, [nodes, edges, validateFlowDesign]);

  // Simulate flow execution
  const simulateFlowExecution = useCallback(async (scenario: string = 'default') => {
    if (!currentFlowId) {
      console.warn('Cannot simulate flow: No flow ID');
      return;
    }

    setSimulationStatus('running');
    setSimulationResults(null);

    try {
      const mockData = {
        callerNumber: '+442012345678',
        calledNumber: '+442046343130',
        ivrSelection: '1',
        userInput: 'John Smith'
      };

      const result = await flowsAPI.simulateFlow(currentFlowId, {
        scenario,
        mockData
      });

      setSimulationResults({
        executionPath: result.executionPath,
        summary: result.summary
      });

      setSimulationStatus('completed');
      
      console.log('Flow simulation completed:', {
        steps: result.executionPath.length,
        duration: result.summary.totalDuration,
        outcome: result.summary.finalOutcome
      });

    } catch (error) {
      console.error('Flow simulation failed:', error);
      setSimulationStatus('error');
      setSimulationResults({
        executionPath: [{
          nodeId: 'error',
          nodeType: 'error',
          nodeLabel: 'Simulation Error',
          action: 'Simulation failed',
          result: 'Failed to simulate flow. Please try again.',
          duration: 0
        }],
        summary: {
          totalSteps: 1,
          totalDuration: 0,
          finalOutcome: 'Simulation failed',
          successful: false
        }
      });
    }
  }, [currentFlowId]);

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

  // Node palette data - Professional Call Center Flow Nodes
  const nodeCategories = [
    {
      id: 'routing',
      title: 'Call Routing',
      nodes: [
        { id: 'external_transfer', icon: '📞', name: 'External Transfer', type: 'external_transfer', description: 'Transfer to external DDI/phone number' },
        { id: 'queue_transfer', icon: '�', name: 'Queue Transfer', type: 'queue_transfer', description: 'Route to internal agent queue' }
      ]
    },
    {
      id: 'media',
      title: 'Audio & Media',
      nodes: [
        { id: 'audio_playback', icon: '�', name: 'Play Audio', type: 'audio_playback', description: 'Play uploaded audio file' },
        { id: 'text_to_speech', icon: '�️', name: 'Text to Speech', type: 'text_to_speech', description: 'Convert text to speech' }
      ]
    },
    {
      id: 'conditions',
      title: 'Conditions & Logic',
      nodes: [
        { id: 'business_hours', icon: '�', name: 'Business Hours', type: 'business_hours', description: 'Route based on time and date' },
        { id: 'caller_condition', icon: '👤', name: 'Caller Check', type: 'caller_condition', description: 'Route based on caller data' }
      ]
    },
    {
      id: 'ivr',
      title: 'Interactive Voice',
      nodes: [
        { id: 'ivr_menu', icon: '🔢', name: 'IVR Menu', type: 'ivr_menu', description: 'Interactive menu options' },
        { id: 'collect_input', icon: '⌨️', name: 'Collect Input', type: 'collect_input', description: 'Gather digits or speech' }
      ]
    },
    {
      id: 'workflow',
      title: 'Flow Control',
      nodes: [
        { id: 'hangup', icon: '�', name: 'End Call', type: 'hangup', description: 'Gracefully terminate call' }
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

              {/* Validation Status */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={validateFlowDesign}
                  className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-slate-500 hover:bg-slate-400 transition-colors"
                  title="Validate flow design"
                  disabled={validationStatus === 'validating'}
                >
                  <Settings size={12} />
                  <span>Validate</span>
                </button>

                <button
                  onClick={() => simulateFlowExecution(selectedScenario)}
                  className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-blue-500 hover:bg-blue-400 transition-colors"
                  title="Test flow execution"
                  disabled={simulationStatus === 'running'}
                >
                  <GitBranch size={12} />
                  <span>Test</span>
                </button>
                
                <div className="flex items-center space-x-1 text-xs">
                  {validationStatus === 'unvalidated' && (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-slate-200">Not validated</span>
                    </>
                  )}
                  {validationStatus === 'validating' && (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-slate-200">Validating...</span>
                    </>
                  )}
                  {validationStatus === 'valid' && (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-green-300">Valid</span>
                    </>
                  )}
                  {validationStatus === 'invalid' && (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                      <span className="text-red-300">
                        {validationResults?.errors.length || 0} errors
                      </span>
                    </>
                  )}
                </div>

                {/* Simulation Status */}
                <div className="flex items-center space-x-1 text-xs">
                  {simulationStatus === 'idle' && (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-slate-200">Not tested</span>
                    </>
                  )}
                  {simulationStatus === 'running' && (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-slate-200">Testing...</span>
                    </>
                  )}
                  {simulationStatus === 'completed' && (
                    <>
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span className="text-blue-300">
                        {simulationResults?.summary.totalSteps || 0} steps
                      </span>
                    </>
                  )}
                  {simulationStatus === 'error' && (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                      <span className="text-red-300">Test failed</span>
                    </>
                  )}
                </div>
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
              flowId={currentFlowId}
              allNodes={nodes}
              onNodeSelect={(node) => setSelectedNode(node)}
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
                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50">
                  {category.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-slate-300 hover:shadow-md transition-all"
                      draggable
                      onDragStart={(event) => onDragStart(event, node)}
                      title={`${node.name}: ${node.description || 'Drag to add to flow'}`}
                    >
                      <div className="text-2xl mb-2">{node.icon}</div>
                      <div className="text-xs text-gray-700 text-center font-medium leading-tight">
                        {node.name}
                      </div>
                      {node.description && (
                        <div className="text-xs text-gray-500 text-center mt-1 leading-tight">
                          {node.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
            
            {/* Validation Results Panel */}
            {validationResults && (validationResults.errors.length > 0 || validationResults.warnings.length > 0) && (
              <div className="border-t border-gray-200 mt-4">
                <div className="px-4 py-3">
                  <h3 className="font-medium text-gray-900 mb-2">Validation Results</h3>
                  
                  {validationResults.errors.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-red-700 mb-1">
                        Errors ({validationResults.errors.length})
                      </h4>
                      <div className="space-y-2">
                        {validationResults.errors.map((error, index) => (
                          <div
                            key={index}
                            className="p-2 bg-red-50 border border-red-200 rounded-md cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => {
                              if (error.nodeId) {
                                const node = nodes.find(n => n.id === error.nodeId);
                                if (node) setSelectedNode(node);
                              }
                            }}
                            title={error.nodeId ? "Click to select node" : undefined}
                          >
                            <div className="text-xs font-medium text-red-800">{error.code}</div>
                            <div className="text-xs text-red-700">{error.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {validationResults.warnings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-yellow-700 mb-1">
                        Warnings ({validationResults.warnings.length})
                      </h4>
                      <div className="space-y-2">
                        {validationResults.warnings.map((warning, index) => (
                          <div
                            key={index}
                            className="p-2 bg-yellow-50 border border-yellow-200 rounded-md cursor-pointer hover:bg-yellow-100 transition-colors"
                            onClick={() => {
                              if (warning.nodeId) {
                                const node = nodes.find(n => n.id === warning.nodeId);
                                if (node) setSelectedNode(node);
                              }
                            }}
                            title={warning.nodeId ? "Click to select node" : undefined}
                          >
                            <div className="text-xs font-medium text-yellow-800">{warning.code}</div>
                            <div className="text-xs text-yellow-700">{warning.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {validationResults.summary && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Flow Summary: {validationResults.summary.totalNodes} nodes, {validationResults.summary.totalEdges} connections
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Simulation Results Panel */}
            {simulationResults && simulationResults.executionPath.length > 0 && (
              <div className="border-t border-gray-200 mt-4">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Test Results</h3>
                    <select
                      value={selectedScenario}
                      onChange={(e) => setSelectedScenario(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="default">Normal Hours</option>
                      <option value="out_of_hours">Out of Hours</option>
                      <option value="busy_queue">Busy Queue</option>
                      <option value="weekend">Weekend</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Execution Path ({simulationResults.summary.totalSteps} steps)</span>
                      <span>{simulationResults.summary.totalDuration}ms</span>
                    </div>
                    
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {simulationResults.executionPath.map((step, index) => (
                        <div
                          key={index}
                          className="p-2 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => {
                            const node = nodes.find(n => n.id === step.nodeId);
                            if (node) setSelectedNode(node);
                          }}
                          title="Click to select node"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-blue-800">
                              {index + 1}. {step.nodeLabel || step.nodeType}
                            </div>
                            <div className="text-xs text-blue-600">
                              {step.duration}ms
                            </div>
                          </div>
                          <div className="text-xs text-blue-700">
                            {step.action}: {step.result}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Outcome: {simulationResults.summary.finalOutcome}
                      {simulationResults.summary.successful ? ' ✓' : ' ⚠️'}
                    </div>
                  </div>
                </div>
              </div>
            )}
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