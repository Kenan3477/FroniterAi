-- User Session Tracking Enhancement
-- Add UserSession model to track login/logout events

-- Create UserSession table
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    session_id TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'logged_out', 'expired', 'forced_logout'
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_duration INTEGER, -- in seconds, calculated on logout
    browser_info TEXT,
    device_type TEXT,
    location_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_status ON user_sessions(status);
CREATE INDEX idx_user_sessions_login_time ON user_sessions(login_time);
CREATE INDEX idx_user_sessions_logout_time ON user_sessions(logout_time);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);

-- Add audit log entries for existing login events (mock some historical data)
INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by_user_id,
    performed_by_user_email,
    performed_by_user_name,
    ip_address,
    user_agent,
    metadata,
    severity,
    timestamp
) 
SELECT 
    'USER_LOGIN' as action,
    'User' as entity_type,
    CAST(u.id AS TEXT) as entity_id,
    CAST(u.id AS TEXT) as performed_by_user_id,
    u.email as performed_by_user_email,
    u.firstName || ' ' || u.lastName as performed_by_user_name,
    '192.168.1.' || (ABS(RANDOM()) % 254 + 1) as ip_address,
    'Mozilla/5.0 (Compatible User Agent)' as user_agent,
    '{"sessionId":"mock-session-' || u.id || '","loginMethod":"password","deviceType":"desktop"}' as metadata,
    'INFO' as severity,
    u.last_login as timestamp
FROM users u 
WHERE u.last_login IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM audit_logs al 
    WHERE al.performed_by_user_id = CAST(u.id AS TEXT) 
    AND al.action = 'USER_LOGIN'
    AND DATE(al.timestamp) = DATE(u.last_login)
);