-- Call Transcription System Migration
-- Production-ready transcription pipeline with AI post-processing

-- Add transcription_status to call_records table
ALTER TABLE call_records 
ADD COLUMN transcription_status VARCHAR(20) DEFAULT NULL;

-- Create enhanced call_transcripts table
CREATE TABLE call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) NOT NULL REFERENCES call_records(id) ON DELETE CASCADE,
    transcript_text TEXT NOT NULL,
    structured_json JSONB,
    summary TEXT,
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= 0 AND sentiment_score <= 1),
    compliance_flags JSONB,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- AI analysis fields
    call_outcome_classification VARCHAR(50),
    key_objections JSONB,
    
    -- Advanced analytics
    agent_talk_ratio DECIMAL(3,2),
    customer_talk_ratio DECIMAL(3,2), 
    longest_monologue_seconds INTEGER,
    silence_duration_seconds INTEGER,
    interruptions_count INTEGER,
    script_adherence_score DECIMAL(3,2),
    
    -- Processing metadata
    processing_provider VARCHAR(20) NOT NULL DEFAULT 'openai',
    processing_time_ms INTEGER,
    processing_cost DECIMAL(8,4),
    word_count INTEGER,
    
    -- GDPR compliance
    retention_expires_at TIMESTAMP,
    data_region VARCHAR(10) DEFAULT 'global',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_status ON call_transcripts(processing_status);
CREATE INDEX idx_call_transcripts_provider ON call_transcripts(processing_provider);
CREATE INDEX idx_call_transcripts_retention ON call_transcripts(retention_expires_at);
CREATE INDEX idx_call_transcripts_region ON call_transcripts(data_region);
CREATE INDEX idx_call_transcripts_created ON call_transcripts(created_at);

-- Create transcription_jobs table for queue management
CREATE TABLE transcription_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) NOT NULL REFERENCES call_records(id) ON DELETE CASCADE,
    recording_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    priority INTEGER NOT NULL DEFAULT 100,
    
    -- Job metadata
    job_type VARCHAR(20) NOT NULL DEFAULT 'transcription' CHECK (job_type IN ('transcription', 'backfill', 'reprocess')),
    provider VARCHAR(20) NOT NULL DEFAULT 'openai',
    
    -- Error handling
    error_message TEXT,
    last_error_at TIMESTAMP,
    
    -- Scheduling
    scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Audit trail
    created_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for job queue performance
CREATE INDEX idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX idx_transcription_jobs_priority ON transcription_jobs(priority);
CREATE INDEX idx_transcription_jobs_scheduled ON transcription_jobs(scheduled_at);
CREATE INDEX idx_transcription_jobs_call_id ON transcription_jobs(call_id);
CREATE INDEX idx_transcription_jobs_provider ON transcription_jobs(provider);

-- Create transcription_audit table for compliance tracking
CREATE TABLE transcription_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    user_id VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcription_audit_call_id ON transcription_audit(call_id);
CREATE INDEX idx_transcription_audit_action ON transcription_audit(action);
CREATE INDEX idx_transcription_audit_created ON transcription_audit(created_at);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_call_transcripts_updated_at 
    BEFORE UPDATE ON call_transcripts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcription_jobs_updated_at 
    BEFORE UPDATE ON transcription_jobs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial configuration
INSERT INTO transcription_jobs (call_id, recording_url, job_type, priority)
SELECT 
    cr.id,
    COALESCE(r.filePath, cr.recording, 'missing'),
    'backfill',
    200
FROM call_records cr
LEFT JOIN recordings r ON r.callRecordId = cr.id
WHERE cr.transcription_status IS NULL
  AND (r.filePath IS NOT NULL OR cr.recording IS NOT NULL)
  AND cr.duration > 5; -- Only transcribe calls longer than 5 seconds

-- Update call_records with initial transcription status
UPDATE call_records 
SET transcription_status = 'queued'
WHERE id IN (
    SELECT call_id FROM transcription_jobs WHERE job_type = 'backfill'
);

COMMIT;