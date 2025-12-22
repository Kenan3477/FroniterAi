import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Omnivox AI Flows database...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'admin@omnivox.ai' },
    update: {},
    create: {
      username: 'admin@omnivox.ai',
      firstName: 'Omnivox AI',
      lastName: 'Admin', 
      name: 'Omnivox AI Admin',
      email: 'admin@omnivox.ai',
      password: '$2a$12$1Uo5M4eA1WFmCMmECCHCzeDOiQTySdExcD2GeCUKZ9YSlTLW67wKK', // SecureAdmin2025!@#$%^
    },
  });

  console.log('✅ Created demo user:', demoUser.name);

  // Define node type definitions for Omnivox AI Flows
  const nodeTypeDefinitions = [
    // EVENT TRIGGERS
    {
      type: 'event:inbound_call',
      category: 'EventTrigger',
      displayName: 'Inbound Call',
      icon: '📞',
      description: 'Triggered when an inbound call is received',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          phoneNumber: { type: 'string', title: 'Phone Number Pattern' },
          businessHours: { type: 'boolean', title: 'Business Hours Only' }
        }
      }),
      ports: JSON.stringify(['success'])
    },
    {
      type: 'event:inbound_whatsapp',
      category: 'EventTrigger',
      displayName: 'WhatsApp Message',
      icon: '💬',
      description: 'Triggered when a WhatsApp message is received',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          messageType: { type: 'string', enum: ['text', 'image', 'document'] },
          keywords: { type: 'string', title: 'Trigger Keywords' }
        }
      }),
      ports: JSON.stringify(['success'])
    },
    {
      type: 'event:webhook',
      category: 'EventTrigger',
      displayName: 'Webhook',
      icon: '🔗',
      description: 'Triggered by external webhook calls',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          webhookUrl: { type: 'string', title: 'Webhook URL' },
          secret: { type: 'string', title: 'Secret Token' }
        }
      }),
      ports: JSON.stringify(['success'])
    },
    {
      type: 'event:schedule',
      category: 'EventTrigger',
      displayName: 'Schedule',
      icon: '⏰',
      description: 'Triggered on a time schedule',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          cronExpression: { type: 'string', title: 'Cron Expression' },
          timezone: { type: 'string', title: 'Timezone' }
        }
      }),
      ports: JSON.stringify(['success'])
    },

    // CONDITIONALS
    {
      type: 'condition:expression',
      category: 'Condition',
      displayName: 'If/Then Expression',
      icon: '🔀',
      description: 'Evaluate a conditional expression',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          expression: { type: 'string', title: 'Condition Expression' },
          description: { type: 'string', title: 'Description' }
        },
        required: ['expression']
      }),
      ports: JSON.stringify(['true', 'false'])
    },
    {
      type: 'condition:switch',
      category: 'Condition',
      displayName: 'Switch Case',
      icon: '🔄',
      description: 'Switch between multiple cases',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          variable: { type: 'string', title: 'Variable to Switch On' },
          cases: { 
            type: 'array',
            title: 'Cases',
            items: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                label: { type: 'string' }
              }
            }
          }
        }
      }),
      ports: JSON.stringify(['case1', 'case2', 'case3', 'default'])
    },

    // ACTIONS
    {
      type: 'action:play_audio',
      category: 'Action',
      displayName: 'Play Audio',
      icon: '🔊',
      description: 'Play an audio file or text-to-speech',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          audioType: { type: 'string', enum: ['file', 'tts'], title: 'Audio Type' },
          audioUrl: { type: 'string', title: 'Audio File URL' },
          ttsText: { type: 'string', title: 'Text to Speech' },
          voice: { type: 'string', title: 'Voice' }
        }
      }),
      ports: JSON.stringify(['success', 'error'])
    },
    {
      type: 'action:transfer_queue',
      category: 'Action',
      displayName: 'Transfer to Queue',
      icon: '📞',
      description: 'Transfer call to an agent queue',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          queueId: { type: 'string', title: 'Queue ID' },
          priority: { type: 'string', enum: ['low', 'normal', 'high'], title: 'Priority' },
          timeout: { type: 'number', title: 'Timeout (seconds)' }
        },
        required: ['queueId']
      }),
      ports: JSON.stringify(['connected', 'timeout', 'failed'])
    },
    {
      type: 'action:send_sms',
      category: 'Action',
      displayName: 'Send SMS',
      icon: '📱',
      description: 'Send an SMS message',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          phoneNumber: { type: 'string', title: 'Phone Number' },
          message: { type: 'string', title: 'Message Content' },
          fromNumber: { type: 'string', title: 'From Number' }
        },
        required: ['phoneNumber', 'message']
      }),
      ports: JSON.stringify(['success', 'failed'])
    },
    {
      type: 'action:http_request',
      category: 'Action',
      displayName: 'HTTP Request',
      icon: '🔌',
      description: 'Make an HTTP API call',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          url: { type: 'string', title: 'URL' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], title: 'HTTP Method' },
          headers: { type: 'string', title: 'Headers (JSON)' },
          body: { type: 'string', title: 'Request Body' },
          timeout: { type: 'number', title: 'Timeout (ms)', default: 5000 }
        },
        required: ['url', 'method']
      }),
      ports: JSON.stringify(['success', 'error'])
    },
    {
      type: 'action:update_crm',
      category: 'Action',
      displayName: 'Update CRM',
      icon: '📊',
      description: 'Update customer record in CRM',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          contactId: { type: 'string', title: 'Contact ID' },
          fields: { type: 'string', title: 'Fields to Update (JSON)' },
          notes: { type: 'string', title: 'Interaction Notes' }
        },
        required: ['contactId']
      }),
      ports: JSON.stringify(['success', 'failed'])
    },

    // AI NODES
    {
      type: 'ai:classify_intent',
      category: 'AI',
      displayName: 'Classify Intent',
      icon: '🤖',
      description: 'Classify customer intent using AI',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          inputText: { type: 'string', title: 'Input Text' },
          intents: { type: 'string', title: 'Possible Intents (comma-separated)' },
          confidence: { type: 'number', title: 'Minimum Confidence', minimum: 0, maximum: 1 }
        },
        required: ['inputText', 'intents']
      }),
      ports: JSON.stringify(['intent1', 'intent2', 'intent3', 'unknown'])
    },
    {
      type: 'ai:sentiment_analysis',
      category: 'AI',
      displayName: 'Sentiment Analysis',
      icon: '😊',
      description: 'Analyze sentiment of customer message',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          inputText: { type: 'string', title: 'Text to Analyze' },
          threshold: { type: 'number', title: 'Sentiment Threshold', minimum: -1, maximum: 1 }
        },
        required: ['inputText']
      }),
      ports: JSON.stringify(['positive', 'neutral', 'negative'])
    },

    // BULK AUTOMATIONS
    {
      type: 'bulk:send_campaign',
      category: 'BulkAutomation',
      displayName: 'Send Campaign',
      icon: '👥',
      description: 'Send bulk campaign to contact list',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          contactListId: { type: 'string', title: 'Contact List ID' },
          messageTemplate: { type: 'string', title: 'Message Template' },
          channel: { type: 'string', enum: ['sms', 'email', 'whatsapp'], title: 'Channel' },
          schedule: { type: 'string', title: 'Schedule (ISO Date)' }
        },
        required: ['contactListId', 'messageTemplate', 'channel']
      }),
      ports: JSON.stringify(['success', 'failed'])
    }
  ];

  // Insert node type definitions
  for (const nodeType of nodeTypeDefinitions) {
    await prisma.nodeTypeDefinition.upsert({
      where: { type: nodeType.type },
      update: nodeType,
      create: nodeType,
    });
  }

  console.log('✅ Seeded', nodeTypeDefinitions.length, 'node type definitions');

  // Create a demo flow
  const demoFlow = await prisma.flow.create({
    data: {
      name: 'Flash Inbound Demo',
      description: 'Demo inbound call flow for customer service',
      status: 'ACTIVE',
      createdByUserId: demoUser.id,
      versions: {
        create: {
          versionNumber: 1,
          isActive: true,
          isDraft: false,
          publishedAt: new Date(),
          nodes: {
            create: [
              {
                id: 'start-node',
                type: 'event:inbound_call',
                label: 'Inbound Call',
                category: 'EventTrigger',
                x: 300,
                y: 100,
                isEntry: true,
                config: JSON.stringify({ businessHours: true })
              },
              {
                id: 'play-greeting',
                type: 'action:play_audio',
                label: 'Play Greeting',
                category: 'Action',
                x: 300,
                y: 250,
                config: JSON.stringify({ 
                  audioType: 'tts', 
                  ttsText: 'Welcome to Omnivox AI. Your call is important to us.',
                  voice: 'english-female'
                })
              },
              {
                id: 'transfer-queue',
                type: 'action:transfer_queue',
                label: 'Transfer to Support',
                category: 'Action',
                x: 300,
                y: 400,
                config: JSON.stringify({ 
                  queueId: 'customer-support',
                  priority: 'normal',
                  timeout: 300
                })
              }
            ]
          },
          edges: {
            create: [
              {
                sourceNodeId: 'start-node',
                targetNodeId: 'play-greeting',
                sourcePort: 'success'
              },
              {
                sourceNodeId: 'play-greeting',
                targetNodeId: 'transfer-queue',
                sourcePort: 'success'
              }
            ]
          }
        }
      }
    }
  });

  console.log('✅ Created demo flow:', demoFlow.name);
  console.log('🎉 Omnivox AI Flows database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });