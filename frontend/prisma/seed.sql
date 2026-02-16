-- Seed the SQLite database with minimal required data for disposition saving

-- Insert DataList (required for contacts)
INSERT OR REPLACE INTO data_lists (id, listId, name, active, totalContacts, createdAt, updatedAt)
VALUES ('list1', 'manual-dial-list', 'Manual Dial List', 1, 0, datetime('now'), datetime('now'));

-- Insert Campaign (required for interactions)  
INSERT OR REPLACE INTO Campaign (id, campaignId, name, dialMethod, status, description, createdAt, updatedAt)
VALUES ('camp1', 'manual-dial', 'Manual Dial Campaign', 'Manual', 'Active', 'Default campaign for manual dialing', datetime('now'), datetime('now'));

-- Insert Agents (required for interactions)
INSERT OR REPLACE INTO agents (id, agentId, firstName, lastName, email, status, createdAt, updatedAt)
VALUES ('agent1', 'agent-browser', 'Browser', 'Agent', 'browser@omnivox.ai', 'Online', datetime('now'), datetime('now'));

INSERT OR REPLACE INTO agents (id, agentId, firstName, lastName, email, status, createdAt, updatedAt)  
VALUES ('agent2', 'system-agent', 'System', 'Agent', 'system@omnivox.ai', 'Online', datetime('now'), datetime('now'));