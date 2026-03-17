# Flow Integration Implementation

## Overview
Flow Integration connects the existing Flow Engine platform with campaign management to enable automated workflows triggered by call events.

## Database Schema Additions

### CampaignFlow
```sql
CREATE TABLE campaign_flows (
  id TEXT PRIMARY KEY DEFAULT(gen_random_uuid()),
  campaignId TEXT NOT NULL REFERENCES campaigns(id),
  flowId TEXT NOT NULL,
  triggerType TEXT NOT NULL, -- 'outbound_start' | 'inbound_start' | 'manual'
  priority INTEGER DEFAULT 1,
  conditions JSON DEFAULT '{}',
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaignId, flowId, triggerType)
);
```

### FlowExecution
```sql
CREATE TABLE flow_executions (
  id TEXT PRIMARY KEY DEFAULT(gen_random_uuid()),
  flowId TEXT NOT NULL,
  campaignId TEXT NOT NULL REFERENCES campaigns(id),
  callId TEXT REFERENCES calls(id),
  agentId TEXT REFERENCES agents(id),
  status TEXT DEFAULT 'INITIATED', -- 'INITIATED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  currentStep TEXT,
  executionData JSON DEFAULT '{}',
  errorMessage TEXT,
  startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### FlowExecutionStep
```sql
CREATE TABLE flow_execution_steps (
  id TEXT PRIMARY KEY DEFAULT(gen_random_uuid()),
  executionId TEXT NOT NULL REFERENCES flow_executions(id),
  stepId TEXT NOT NULL,
  stepName TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  stepData JSON DEFAULT '{}',
  resultData JSON DEFAULT '{}',
  errorMessage TEXT,
  startedAt DATETIME,
  completedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Flow Integration Service

Core service implementing:
- `assignFlowToCampaign(campaignId, flowId, triggerType, conditions)`
- `triggerFlowExecution(callId, campaignId, agentId, triggerType)`
- `completeFlowStep(executionId, stepId, stepData)`
- `getFlowExecution(executionId)`
- `getAgentActiveFlows(agentId)`

## API Endpoints

### Campaign Flow Management
- `POST /api/campaigns/:id/flows` - Assign flow to campaign
- `GET /api/campaigns/:id/flows` - Get campaign flows
- `DELETE /api/campaigns/:id/flows/:flowId` - Remove flow assignment

### Flow Execution
- `POST /api/campaigns/:id/flows/trigger` - Trigger flow execution
- `PUT /api/flow-executions/:id/steps/:stepId/complete` - Complete step
- `GET /api/flow-executions/:id` - Get execution details
- `GET /api/agents/:id/flows/active` - Get agent active flows

## Event Integration

New flow events added to real-time system:
- `flow.assigned` - Flow assigned to campaign
- `flow.started` - Flow execution started
- `flow.step.completed` - Flow step completed
- `flow.completed` - Flow execution completed
- `flow.failed` - Flow execution failed

## Campaign-Specific Recording Integration

Flow execution metadata includes campaign information to ensure:
- Call recordings are tagged with campaign ID
- Recording storage organized by campaign
- Recording access restricted by campaign permissions
- Recording retention policies applied per campaign

## Implementation Status

✅ Database schema designed and implemented
✅ Event types defined
✅ Service interface designed
🚧 Service implementation in progress
⏳ API routes pending
⏳ Frontend components pending
⏳ Real-time event broadcasting pending

## Next Steps

1. Complete FlowIntegrationService implementation
2. Create API routes with proper validation
3. Implement real-time event broadcasting
4. Build frontend flow management components
5. Add campaign-specific recording logic
6. Test flow execution workflows