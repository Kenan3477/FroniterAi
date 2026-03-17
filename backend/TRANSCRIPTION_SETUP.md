# Omnivox AI - Transcription System Setup Guide

## Overview

This document provides complete setup instructions for the Omnivox AI transcription system, which provides:

- 🎯 **Automatic Call Transcription** using OpenAI Whisper API
- 🤖 **AI-Powered Analysis** with GPT-4 integration  
- 📊 **Real-time Processing** of new call recordings
- 🔧 **Admin Management** interface for monitoring and control

## 🚀 Quick Start

### 1. Configure OpenAI Integration

```bash
# Run the interactive setup script
npm run setup:openai
```

This script will:
- Guide you through obtaining an OpenAI API key
- Validate your API key
- Update your .env configuration
- Provide cost estimates

### 2. Check System Status

```bash
# View system health dashboard
npm run transcription:status
```

### 3. Test the Complete System

```bash
# Run comprehensive tests
npm run transcription:test
```

### 4. Start the System

```bash
# Start backend with transcription system
npm run dev
```

## 📋 Manual Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Transcription Settings
AUDIO_STORAGE_PATH=./storage/audio
TRANSCRIPTION_CONCURRENCY=3
DAILY_COST_LIMIT=100
AUTO_DELETE_AUDIO_FILES=true

# Existing Twilio & Redis settings...
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
REDIS_URL=your_redis_url
```

### Storage Directory

The system will automatically create the audio storage directory, but you can prepare it manually:

```bash
mkdir -p ./storage/audio
chmod 755 ./storage/audio
```

## 🔧 System Architecture

### Components

1. **AudioFileService** (`src/services/audioFileService.ts`)
   - Downloads recordings from Twilio
   - Manages local storage and cleanup
   - Handles file validation and security

2. **TranscriptionService** (`src/services/transcriptionService.ts`)
   - Processes audio files through OpenAI Whisper
   - Manages transcription queue with Redis
   - Stores results in database

3. **ConfigurationService** (`src/services/configurationService.ts`)
   - Validates system configuration
   - Performs health checks
   - Monitors API quotas and costs

4. **Webhook Integration** (`src/routes/webhooks.ts`)
   - Receives Twilio call completion events
   - Automatically queues transcription jobs
   - Provides real-time processing

5. **Admin API** (`src/routes/transcriptManagement.ts`)
   - System status monitoring
   - Queue management
   - Storage cleanup tools

### Data Flow

```
1. Call Ends → Twilio Webhook
2. Webhook → Queue Transcription Job
3. Worker → Download Audio File
4. Worker → Send to OpenAI Whisper
5. Worker → Store Transcript + Cleanup
6. Admin API → Monitor Progress
```

## 📊 Monitoring & Management

### Admin Endpoints

- **System Status**: `GET /api/admin/transcripts/system/status`
- **Queue Status**: `GET /api/admin/transcripts/queue/status`
- **Storage Cleanup**: `POST /api/admin/transcripts/storage/cleanup`
- **Configuration**: `GET /api/admin/transcripts/configuration`

### CLI Commands

```bash
# System health and status
npm run transcription:status

# Test complete pipeline
npm run transcription:test

# Setup/reconfigure OpenAI
npm run setup:openai

# Run transcription worker
npm run transcription:worker

# Backfill existing recordings
npm run transcription:backfill
```

### Logs and Debugging

The system emits structured logs with these identifiers:
- `callId`: Unique call identifier
- `transcriptionJobId`: Job queue identifier
- `audioFileId`: Local file reference

Example log entry:
```
[Transcription] Processing callId: call_abc123, jobId: job_xyz789
```

## 💰 Cost Management

### OpenAI Whisper Pricing

- **Rate**: $0.006 per minute of audio
- **1-hour call**: ~$0.36
- **10-minute call**: ~$0.06
- **1000 calls/month (10 min avg)**: ~$60

### Cost Controls

1. **Daily Limit**: Set `DAILY_COST_LIMIT` in .env
2. **File Cleanup**: Enable `AUTO_DELETE_AUDIO_FILES=true`
3. **Queue Monitoring**: Track usage via admin API
4. **Batch Processing**: Configure `TRANSCRIPTION_CONCURRENCY`

## 🔒 Security & Compliance

### Audio File Handling

- Files stored locally with secure permissions
- Optional automatic deletion after processing
- No audio data sent to external services except OpenAI
- Temporary files cleaned up after processing

### API Security

- OpenAI API key encrypted in environment
- Admin endpoints require authentication
- Audit logs for all transcription operations
- Rate limiting on transcription requests

## 🚨 Troubleshooting

### Common Issues

**OpenAI API Key Invalid**
```bash
# Re-run setup with new key
npm run setup:openai
```

**Storage Permission Errors**
```bash
# Fix directory permissions
chmod -R 755 ./storage
```

**Queue Not Processing**
```bash
# Check Redis connection
npm run transcription:status

# Restart worker
npm run transcription:worker
```

**High API Costs**
```bash
# Check current usage
curl http://localhost:3001/api/admin/transcripts/system/status

# Reduce concurrency
# Set TRANSCRIPTION_CONCURRENCY=1 in .env
```

### Support

For technical issues:
1. Check system status: `npm run transcription:status`
2. Run system tests: `npm run transcription:test`
3. Review application logs for error details
4. Verify all environment variables are set correctly

### Performance Optimization

**For High Volume**:
- Increase `TRANSCRIPTION_CONCURRENCY` (max 10)
- Use Redis cluster for queue scaling
- Consider dedicated storage volume
- Monitor API rate limits

**For Cost Optimization**:
- Enable `AUTO_DELETE_AUDIO_FILES`
- Set conservative `DAILY_COST_LIMIT`
- Implement call duration filtering
- Use batch processing windows

## 🔄 Maintenance

### Regular Tasks

1. **Monitor Storage**: Check disk usage weekly
2. **Review Costs**: Monitor OpenAI usage monthly  
3. **Clean Queue**: Clear failed jobs if needed
4. **Update Keys**: Rotate API keys quarterly

### Backup Strategy

- Database transcripts backed up with main DB
- Audio files are temporary (can be re-downloaded)
- Configuration stored in version control
- Monitor logs for processing failures

## 📈 Future Enhancements

The current system provides foundation for:

- **Real-time Sentiment Analysis** during calls
- **Automated Call Scoring** with quality metrics
- **Compliance Monitoring** for regulatory requirements
- **Speaker Identification** for multi-party calls
- **Custom Vocabulary** for industry-specific terms
- **Integration with CRM** for context-aware analysis

These features can be added incrementally using the existing infrastructure.