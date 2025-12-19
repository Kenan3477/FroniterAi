-- Migration: Add Flow-Campaign Integration Tables
-- This migration adds the necessary tables to integrate flows with campaigns

-- Campaign-Flow Association Table
CREATE TABLE campaign_flows (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    flow_id VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'outbound_start', 'inbound_start', 'agent_available', 'custom'
    priority INTEGER DEFAULT 1,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (campaign_id) REFERENCES dialler_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
    
    UNIQUE(campaign_id, flow_id, trigger_type)
);

-- Flow Execution Tracking Table
CREATE TABLE flow_executions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    call_id VARCHAR(255),
    agent_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'INITIATED', -- 'INITIATED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
    current_step VARCHAR(255),
    execution_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (flow_id) REFERENCES flows(id),
    FOREIGN KEY (campaign_id) REFERENCES dialler_campaigns(id),
    FOREIGN KEY (call_id) REFERENCES dialler_calls(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Flow Execution Steps Tracking
CREATE TABLE flow_execution_steps (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) NOT NULL,
    step_id VARCHAR(255) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'
    step_data JSONB DEFAULT '{}',
    result_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (execution_id) REFERENCES flow_executions(id) ON DELETE CASCADE
);

-- Add flow-related fields to existing campaign table
ALTER TABLE dialler_campaigns 
ADD COLUMN default_flow_id VARCHAR(255),
ADD COLUMN flow_config JSONB DEFAULT '{}',
ADD COLUMN recording_enabled BOOLEAN DEFAULT false,
ADD COLUMN recording_config JSONB DEFAULT '{}';

-- Add flow execution reference to calls table
ALTER TABLE dialler_calls 
ADD COLUMN flow_execution_id VARCHAR(255),
ADD COLUMN flow_status VARCHAR(50) DEFAULT 'NONE'; -- 'NONE', 'ASSIGNED', 'RUNNING', 'COMPLETED', 'FAILED'

-- Add foreign key constraints for new fields
ALTER TABLE dialler_campaigns 
ADD CONSTRAINT fk_campaign_default_flow 
FOREIGN KEY (default_flow_id) REFERENCES flows(id) ON DELETE SET NULL;

ALTER TABLE dialler_calls 
ADD CONSTRAINT fk_call_flow_execution 
FOREIGN KEY (flow_execution_id) REFERENCES flow_executions(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_campaign_flows_campaign_id ON campaign_flows(campaign_id);
CREATE INDEX idx_campaign_flows_flow_id ON campaign_flows(flow_id);
CREATE INDEX idx_campaign_flows_trigger_type ON campaign_flows(trigger_type);
CREATE INDEX idx_flow_executions_campaign_id ON flow_executions(campaign_id);
CREATE INDEX idx_flow_executions_call_id ON flow_executions(call_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_execution_steps_execution_id ON flow_execution_steps(execution_id);
CREATE INDEX idx_flow_execution_steps_status ON flow_execution_steps(status);