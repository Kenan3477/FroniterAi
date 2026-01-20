-- Railway Database Setup Script
-- This script creates the missing tables and seeds initial data

-- 1. First, let's try to create a simple campaign assignment manually
-- We need to:
-- A) Create basic campaign data
-- B) Create user/agent records 
-- C) Create assignment relationships

-- Check if we can insert into campaigns table
-- If tables don't exist, this will fail and we'll know we need migrations
INSERT INTO campaigns (campaign_id, name, status, dial_method, description, created_at, updated_at) 
VALUES ('DAC', 'DAC Campaign', 'Active', 'MANUAL', 'Primary campaign for user testing', NOW(), NOW()) 
ON CONFLICT (campaign_id) DO NOTHING;

-- Check if we can insert into users table
INSERT INTO users (id, email, name, role, password_hash, is_active, created_at, updated_at) 
VALUES (1, 'test5@kennex.co.uk', 'Kenan Tester', 'ADMIN', '$2a$10$example', true, NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Try to create agent record if it doesn't exist
INSERT INTO agents (agent_id, first_name, last_name, email, status) 
VALUES ('1', 'Kenan', 'Tester', 'test5@kennex.co.uk', 'Offline') 
ON CONFLICT (agent_id) DO NOTHING;

-- Create campaign assignment via AgentCampaignAssignment
INSERT INTO agent_campaign_assignments (id, agent_id, campaign_id, is_active, assigned_at) 
VALUES (gen_random_uuid(), '1', 'DAC', true, NOW()) 
ON CONFLICT (agent_id, campaign_id) DO NOTHING;

-- Create campaign assignment via UserCampaignAssignment
INSERT INTO user_campaign_assignments (id, user_id, campaign_id, is_active, assigned_at, assigned_by) 
VALUES (gen_random_uuid(), 1, 'DAC', true, NOW(), 1) 
ON CONFLICT (user_id, campaign_id) DO NOTHING;

-- Verify data
SELECT 'Campaigns' as table_name, campaign_id as id, name FROM campaigns
UNION ALL
SELECT 'Users' as table_name, CAST(id as TEXT) as id, name FROM users WHERE id = 1
UNION ALL
SELECT 'Agents' as table_name, agent_id as id, first_name || ' ' || last_name as name FROM agents WHERE agent_id = '1'
UNION ALL
SELECT 'AgentCampaignAssignments' as table_name, agent_id as id, campaign_id as name FROM agent_campaign_assignments WHERE agent_id = '1'
UNION ALL
SELECT 'UserCampaignAssignments' as table_name, CAST(user_id as TEXT) as id, campaign_id as name FROM user_campaign_assignments WHERE user_id = 1;