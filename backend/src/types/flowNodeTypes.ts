/**
 * OMNIVOX-AI FLOW NODE TYPE DEFINITIONS
 * Comprehensive call flow node types for enterprise call center operations
 */

// Core Node Categories
export enum NodeCategory {
  ROUTING = 'routing',           // Call routing and transfer nodes
  MEDIA = 'media',              // Audio playback and recording nodes  
  CONDITION = 'condition',       // Decision and branching nodes
  INTEGRATION = 'integration',   // External system integrations
  QUEUE = 'queue',              // Queue management and distribution
  IVR = 'ivr',                  // Interactive voice response
  WORKFLOW = 'workflow',        // Flow control and logic
  DATA = 'data'                 // Data collection and variables
}

// Base Node Interface
export interface FlowNodeType {
  id: string;
  name: string;
  category: NodeCategory;
  description: string;
  icon: string;
  color: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema: any;
  defaultConfig: any;
  isTerminal?: boolean; // Node ends the flow
  maxInstances?: number; // Limit instances per flow
}

export interface NodePort {
  id: string;
  name: string;
  type: 'default' | 'success' | 'failure' | 'timeout' | 'condition' | 'option';
  required?: boolean;
}

// =============================================================================
// ROUTING CATEGORY NODES
// =============================================================================

export const ExternalTransferNode: FlowNodeType = {
  id: 'external_transfer',
  name: 'External Transfer',
  category: NodeCategory.ROUTING,
  description: 'Transfer call to an external phone number or DDI',
  icon: 'phone-outgoing',
  color: '#10B981', // green
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'connected', name: 'Connected', type: 'success' },
    { id: 'busy', name: 'Busy', type: 'failure' },
    { id: 'no_answer', name: 'No Answer', type: 'timeout' },
    { id: 'failed', name: 'Failed', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        title: 'Phone Number',
        description: 'External number to transfer to (e.g., +442012345678)',
        pattern: '^\\+[1-9]\\d{1,14}$'
      },
      timeout: {
        type: 'number',
        title: 'Ring Timeout (seconds)',
        default: 30,
        minimum: 5,
        maximum: 120
      },
      callerIdOverride: {
        type: 'string',
        title: 'Caller ID Override',
        description: 'Optional caller ID to display to destination'
      },
      transferType: {
        type: 'string',
        title: 'Transfer Type',
        enum: ['blind', 'warm'],
        default: 'blind',
        description: 'Blind transfer or warm transfer with agent introduction'
      }
    },
    required: ['phoneNumber']
  },
  defaultConfig: {
    phoneNumber: '',
    timeout: 30,
    callerIdOverride: '',
    transferType: 'blind'
  },
  isTerminal: true
};

export const QueueTransferNode: FlowNodeType = {
  id: 'queue_transfer',
  name: 'Queue Transfer',
  category: NodeCategory.QUEUE,
  description: 'Transfer call to an internal queue for agent distribution',
  icon: 'users',
  color: '#3B82F6', // blue
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'queued', name: 'Queued Successfully', type: 'success' },
    { id: 'queue_full', name: 'Queue Full', type: 'failure' },
    { id: 'no_agents', name: 'No Agents Available', type: 'failure' },
    { id: 'answered', name: 'Agent Answered', type: 'success' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      queueId: {
        type: 'string',
        title: 'Queue',
        description: 'Select the queue to transfer to',
        // This will be populated from available queues
      },
      priority: {
        type: 'number',
        title: 'Priority Level',
        enum: [1, 2, 3, 4, 5],
        default: 3,
        description: '1 = Highest Priority, 5 = Lowest Priority'
      },
      maxWaitTime: {
        type: 'number',
        title: 'Maximum Wait Time (minutes)',
        default: 10,
        minimum: 1,
        maximum: 60
      },
      skillRequirement: {
        type: 'string',
        title: 'Required Agent Skill',
        description: 'Optional skill requirement for agent selection'
      }
    },
    required: ['queueId']
  },
  defaultConfig: {
    queueId: '',
    priority: 3,
    maxWaitTime: 10,
    skillRequirement: ''
  },
  isTerminal: true
};

// =============================================================================
// MEDIA CATEGORY NODES
// =============================================================================

export const AudioPlaybackNode: FlowNodeType = {
  id: 'audio_playback',
  name: 'Play Audio',
  category: NodeCategory.MEDIA,
  description: 'Play an uploaded audio file to the caller',
  icon: 'volume-2',
  color: '#8B5CF6', // purple
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'completed', name: 'Playback Complete', type: 'success' },
    { id: 'interrupted', name: 'Interrupted by User', type: 'default' },
    { id: 'error', name: 'Playback Error', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      audioFileId: {
        type: 'string',
        title: 'Audio File',
        description: 'Select audio file from Channels > Audio Files'
        // This will be populated from uploaded audio files
      },
      allowSkip: {
        type: 'boolean',
        title: 'Allow Skip',
        default: true,
        description: 'Allow caller to press any key to skip playback'
      },
      volume: {
        type: 'number',
        title: 'Playback Volume',
        default: 100,
        minimum: 0,
        maximum: 200,
        description: 'Volume percentage (100 = normal)'
      },
      loop: {
        type: 'boolean',
        title: 'Loop Playback',
        default: false,
        description: 'Repeat audio file until caller input'
      }
    },
    required: ['audioFileId']
  },
  defaultConfig: {
    audioFileId: '',
    allowSkip: true,
    volume: 100,
    loop: false
  }
};

export const TextToSpeechNode: FlowNodeType = {
  id: 'text_to_speech',
  name: 'Text to Speech',
  category: NodeCategory.MEDIA,
  description: 'Convert text to speech and play to caller',
  icon: 'message-square',
  color: '#8B5CF6', // purple
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'completed', name: 'Speech Complete', type: 'success' },
    { id: 'interrupted', name: 'Interrupted', type: 'default' },
    { id: 'error', name: 'TTS Error', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        title: 'Text to Speak',
        description: 'Text content to convert to speech'
      },
      voice: {
        type: 'string',
        title: 'Voice',
        enum: ['alice', 'bob', 'charlie', 'diana'],
        default: 'alice',
        description: 'TTS voice to use'
      },
      speed: {
        type: 'number',
        title: 'Speech Speed',
        default: 1.0,
        minimum: 0.5,
        maximum: 2.0,
        description: 'Speech rate multiplier'
      },
      language: {
        type: 'string',
        title: 'Language',
        enum: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'],
        default: 'en-GB'
      }
    },
    required: ['text']
  },
  defaultConfig: {
    text: '',
    voice: 'alice',
    speed: 1.0,
    language: 'en-GB'
  }
};

// =============================================================================
// CONDITION CATEGORY NODES
// =============================================================================

export const BusinessHoursNode: FlowNodeType = {
  id: 'business_hours',
  name: 'Business Hours Check',
  category: NodeCategory.CONDITION,
  description: 'Route calls based on current time and business hours',
  icon: 'clock',
  color: '#F59E0B', // amber
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'open', name: 'During Business Hours', type: 'success' },
    { id: 'closed', name: 'Outside Business Hours', type: 'failure' },
    { id: 'holiday', name: 'Holiday/Closed Day', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        title: 'Timezone',
        default: 'Europe/London',
        enum: ['Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney']
      },
      businessDays: {
        type: 'array',
        title: 'Business Days',
        items: {
          type: 'string',
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      openTime: {
        type: 'string',
        title: 'Opening Time',
        format: 'time',
        default: '09:00',
        description: 'Format: HH:MM'
      },
      closeTime: {
        type: 'string',
        title: 'Closing Time',
        format: 'time',
        default: '17:00',
        description: 'Format: HH:MM'
      },
      holidays: {
        type: 'array',
        title: 'Holiday Dates',
        items: {
          type: 'string',
          format: 'date'
        },
        description: 'Dates when business is closed (YYYY-MM-DD format)'
      }
    },
    required: ['timezone', 'businessDays', 'openTime', 'closeTime']
  },
  defaultConfig: {
    timezone: 'Europe/London',
    businessDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    openTime: '09:00',
    closeTime: '17:00',
    holidays: []
  }
};

export const CallerDataConditionNode: FlowNodeType = {
  id: 'caller_condition',
  name: 'Caller Condition',
  category: NodeCategory.CONDITION,
  description: 'Route based on caller phone number, location, or history',
  icon: 'user-check',
  color: '#F59E0B', // amber
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'match', name: 'Condition Met', type: 'success' },
    { id: 'no_match', name: 'Condition Not Met', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      conditionType: {
        type: 'string',
        title: 'Condition Type',
        enum: ['phone_number', 'country_code', 'vip_status', 'call_history'],
        default: 'phone_number'
      },
      operator: {
        type: 'string',
        title: 'Operator',
        enum: ['equals', 'contains', 'starts_with', 'in_list'],
        default: 'equals'
      },
      value: {
        type: 'string',
        title: 'Comparison Value',
        description: 'Value to compare against (e.g., +44, VIP, etc.)'
      },
      valueList: {
        type: 'array',
        title: 'Value List',
        items: { type: 'string' },
        description: 'List of values for "in_list" operator'
      }
    },
    required: ['conditionType', 'operator', 'value']
  },
  defaultConfig: {
    conditionType: 'phone_number',
    operator: 'starts_with',
    value: '+44',
    valueList: []
  }
};

// =============================================================================
// IVR CATEGORY NODES
// =============================================================================

export const MenuNode: FlowNodeType = {
  id: 'ivr_menu',
  name: 'IVR Menu',
  category: NodeCategory.IVR,
  description: 'Interactive menu with multiple options for caller selection',
  icon: 'grid-3x3',
  color: '#EF4444', // red
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'option_1', name: 'Option 1', type: 'option' },
    { id: 'option_2', name: 'Option 2', type: 'option' },
    { id: 'option_3', name: 'Option 3', type: 'option' },
    { id: 'option_0', name: 'Option 0', type: 'option' },
    { id: 'timeout', name: 'No Input (Timeout)', type: 'timeout' },
    { id: 'invalid', name: 'Invalid Input', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      promptText: {
        type: 'string',
        title: 'Menu Prompt',
        default: 'Please select from the following options...',
        description: 'Text to speak before presenting options'
      },
      options: {
        type: 'array',
        title: 'Menu Options',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', title: 'Key', enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'] },
            text: { type: 'string', title: 'Option Text' },
            enabled: { type: 'boolean', title: 'Enabled', default: true }
          }
        },
        default: [
          { key: '1', text: 'For Sales, press 1', enabled: true },
          { key: '2', text: 'For Support, press 2', enabled: true },
          { key: '0', text: 'To speak to an operator, press 0', enabled: true }
        ]
      },
      timeout: {
        type: 'number',
        title: 'Input Timeout (seconds)',
        default: 10,
        minimum: 3,
        maximum: 30
      },
      retries: {
        type: 'number',
        title: 'Max Retries',
        default: 3,
        minimum: 1,
        maximum: 5
      }
    },
    required: ['promptText', 'options']
  },
  defaultConfig: {
    promptText: 'Please select from the following options...',
    options: [
      { key: '1', text: 'For Sales, press 1', enabled: true },
      { key: '2', text: 'For Support, press 2', enabled: true },
      { key: '0', text: 'To speak to an operator, press 0', enabled: true }
    ],
    timeout: 10,
    retries: 3
  }
};

// =============================================================================
// DATA CATEGORY NODES
// =============================================================================

export const CollectInputNode: FlowNodeType = {
  id: 'collect_input',
  name: 'Collect Input',
  category: NodeCategory.DATA,
  description: 'Collect digits, speech, or data from caller',
  icon: 'keyboard',
  color: '#6366F1', // indigo
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [
    { id: 'collected', name: 'Input Collected', type: 'success' },
    { id: 'timeout', name: 'Input Timeout', type: 'timeout' },
    { id: 'invalid', name: 'Invalid Input', type: 'failure' }
  ],
  configSchema: {
    type: 'object',
    properties: {
      inputType: {
        type: 'string',
        title: 'Input Type',
        enum: ['digits', 'speech'],
        default: 'digits'
      },
      prompt: {
        type: 'string',
        title: 'Input Prompt',
        description: 'Text to speak when requesting input'
      },
      minLength: {
        type: 'number',
        title: 'Minimum Length',
        default: 1,
        minimum: 0
      },
      maxLength: {
        type: 'number',
        title: 'Maximum Length',
        default: 10,
        minimum: 1
      },
      timeout: {
        type: 'number',
        title: 'Input Timeout (seconds)',
        default: 15,
        minimum: 5,
        maximum: 60
      },
      variableName: {
        type: 'string',
        title: 'Store in Variable',
        description: 'Variable name to store the collected input'
      }
    },
    required: ['inputType', 'prompt', 'variableName']
  },
  defaultConfig: {
    inputType: 'digits',
    prompt: 'Please enter your input',
    minLength: 1,
    maxLength: 10,
    timeout: 15,
    variableName: 'userInput'
  }
};

// =============================================================================
// WORKFLOW CATEGORY NODES
// =============================================================================

export const HangupNode: FlowNodeType = {
  id: 'hangup',
  name: 'End Call',
  category: NodeCategory.WORKFLOW,
  description: 'Gracefully end the call',
  icon: 'phone-off',
  color: '#DC2626', // red
  inputs: [{ id: 'input', name: 'Input', type: 'default' }],
  outputs: [], // Terminal node
  configSchema: {
    type: 'object',
    properties: {
      farewellMessage: {
        type: 'string',
        title: 'Farewell Message',
        description: 'Optional message to play before hanging up'
      },
      callDisposition: {
        type: 'string',
        title: 'Call Disposition',
        enum: ['completed', 'abandoned', 'transferred', 'voicemail'],
        default: 'completed'
      }
    }
  },
  defaultConfig: {
    farewellMessage: '',
    callDisposition: 'completed'
  },
  isTerminal: true
};

// =============================================================================
// EXPORT ALL NODE TYPES
// =============================================================================

export const AllFlowNodeTypes: FlowNodeType[] = [
  // Routing
  ExternalTransferNode,
  QueueTransferNode,
  
  // Media
  AudioPlaybackNode,
  TextToSpeechNode,
  
  // Conditions
  BusinessHoursNode,
  CallerDataConditionNode,
  
  // IVR
  MenuNode,
  
  // Data
  CollectInputNode,
  
  // Workflow
  HangupNode
];

// Node type registry for quick lookup
export const NodeTypeRegistry = AllFlowNodeTypes.reduce((acc, nodeType) => {
  acc[nodeType.id] = nodeType;
  return acc;
}, {} as Record<string, FlowNodeType>);

// Get nodes by category
export const getNodesByCategory = (category: NodeCategory): FlowNodeType[] => {
  return AllFlowNodeTypes.filter(node => node.category === category);
};

// Get node type by ID
export const getNodeType = (nodeTypeId: string): FlowNodeType | undefined => {
  return NodeTypeRegistry[nodeTypeId];
};