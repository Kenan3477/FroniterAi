# 🎯 Omnivox AI Transcription System - Production Deployment Guide

## 🏗️ SYSTEM OVERVIEW

This production-ready transcription system provides automatic transcription of ALL call recordings using OpenAI Whisper API or self-hosted Whisper instances, with AI-powered post-processing for compliance, sentiment analysis, and call insights.

### ✅ KEY FEATURES

- **Automatic Transcription**: All recordings transcribed in background
- **Historical Backfill**: Process existing calls automatically  
- **AI Analysis**: GPT-4 powered summaries, sentiment, compliance flags
- **GDPR Compliance**: Configurable data retention and regional processing
- **Scalable Architecture**: Handle 100k+ calls/day with Redis queue
- **Cost Management**: Built-in cost tracking and limits
- **Advanced Analytics**: Speaker analytics, talk ratios, interruptions

## 🚀 DEPLOYMENT STEPS

### 1. Database Migration

```bash
# Apply database migration
psql $DATABASE_URL -f backend/database/migrations/001_transcription_system.sql

# Generate Prisma client
cd backend
npm run db:generate
```

### 2. Environment Configuration

```bash
# Copy and configure environment file
cp backend/.env.transcription.example backend/.env.transcription
```

**Required Environment Variables:**

```bash
# Core Settings
TRANSCRIPTION_PROVIDER=openai  # or 'self-hosted'
OPENAI_API_KEY=your-openai-api-key-here
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# File Processing
TEMP_DIRECTORY=/tmp/omnivox-transcripts
MAX_FILE_SIZE=26214400

# GDPR Compliance
TRANSCRIPT_RETENTION_DAYS=365
DATA_REGION=global  # or 'eu' or 'us'

# Performance
TRANSCRIPTION_CONCURRENCY=5
BATCH_SIZE=100
```

### 3. Redis Setup

**Option A: Railway Redis**
```bash
# Add Railway Redis service to your project
railway add redis
```

**Option B: External Redis**
```bash
# Update environment with Redis connection details
REDIS_HOST=your-redis-instance.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 4. Install Dependencies

```bash
cd backend
npm install bull redis
```

### 5. Start Services

**Main API Server (includes transcription endpoints):**
```bash
npm run start:prod
```

**Background Transcription Worker:**
```bash
# Option A: Separate worker process
npx tsx src/scripts/transcriptionWorker.ts

# Option B: PM2 for production
pm2 start src/scripts/transcriptionWorker.ts --name "omnivox-transcription"
```

### 6. Verify Deployment

```bash
# Check queue status
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/transcripts/queue/stats

# Test transcription endpoint
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/calls/CALL_ID/transcript
```

## ⚙️ CONFIGURATION OPTIONS

### Transcription Providers

**OpenAI Whisper API (Recommended):**
- Cost: $0.006 per minute
- High accuracy and speed
- Automatic language detection
- Built-in speaker diarization

**Self-Hosted Whisper:**
- One-time infrastructure cost
- Complete data control
- Requires GPU instances
- Custom endpoint configuration

### Performance Tuning

**High Volume (100k+ calls/day):**
```bash
TRANSCRIPTION_CONCURRENCY=10
BATCH_SIZE=200
REDIS_DB=1  # Dedicated Redis database
```

**EU Data Compliance:**
```bash
DATA_REGION=eu
WHISPER_SELF_HOSTED_ENDPOINT=https://eu-whisper.yourcompany.com
```

**Cost Optimization:**
```bash
DAILY_COST_LIMIT=50.00
ALERT_COST_THRESHOLD=40.00
ENABLE_COST_TRACKING=true
```

## 📊 MONITORING & MAINTENANCE

### Health Checks

The system includes built-in monitoring:

- **Queue Health**: Automatic monitoring every 5 minutes
- **Failed Job Retry**: Hourly retry of failed transcriptions
- **GDPR Cleanup**: Weekly deletion of expired transcripts
- **Cost Tracking**: Real-time cost monitoring with alerts

### Log Monitoring

```bash
# Monitor transcription worker logs
tail -f logs/transcription-worker.log

# Monitor queue performance
redis-cli -h $REDIS_HOST MONITOR
```

### Performance Metrics

Access detailed metrics via API:
```bash
GET /api/transcripts/queue/stats  # Queue statistics
GET /api/transcripts/analytics    # Transcript analytics
```

## 🛡️ SECURITY & COMPLIANCE

### GDPR Compliance

- **Data Retention**: Automatic deletion after configured period
- **Regional Processing**: EU-only data processing when configured
- **Audit Trail**: Complete audit log for all transcription activities
- **Temporary File Cleanup**: Audio files deleted immediately after processing

### Access Controls

- **Role-Based Access**: Agents see only their calls
- **Supervisor Access**: Team-level transcript access
- **Admin Access**: Full system access and management
- **Audit Logging**: All access attempts logged

## 🔧 TROUBLESHOOTING

### Common Issues

**Queue Not Processing:**
```bash
# Check Redis connection
redis-cli -h $REDIS_HOST ping

# Restart worker
pm2 restart omnivox-transcription
```

**High Failure Rate:**
```bash
# Check failed jobs
GET /api/transcripts/queue/stats

# Review error logs
SELECT error_message FROM transcription_jobs WHERE status = 'failed';
```

**Cost Overruns:**
```bash
# Check daily costs
SELECT SUM(processing_cost) FROM call_transcripts 
WHERE created_at >= CURRENT_DATE;

# Adjust limits
DAILY_COST_LIMIT=25.00
```

### Performance Issues

**Slow Processing:**
- Increase `TRANSCRIPTION_CONCURRENCY`
- Check Redis memory usage
- Verify internet connectivity for API calls

**High Memory Usage:**
- Reduce `MAX_FILE_SIZE`
- Implement file compression
- Use streaming uploads

## 📈 SCALING RECOMMENDATIONS

### Small Installation (< 1k calls/day)
```bash
TRANSCRIPTION_CONCURRENCY=2
REDIS_INSTANCE=small
DAILY_COST_LIMIT=10.00
```

### Medium Installation (1k-10k calls/day)
```bash
TRANSCRIPTION_CONCURRENCY=5
REDIS_INSTANCE=medium
DAILY_COST_LIMIT=50.00
```

### Large Installation (10k+ calls/day)
```bash
TRANSCRIPTION_CONCURRENCY=10
REDIS_INSTANCE=large
MULTIPLE_WORKERS=true
DAILY_COST_LIMIT=200.00
```

## 🎯 API ENDPOINTS

### Main Endpoints

- `GET /api/calls/:id/transcript` - Get full transcript
- `GET /api/calls/:id/transcript?format=summary` - Get summary only
- `GET /api/calls/:id/transcript?format=analytics` - Get analytics only
- `GET /api/transcripts/search` - Search transcripts
- `GET /api/transcripts/analytics` - System analytics
- `POST /api/calls/:id/transcript/reprocess` - Reprocess transcript
- `GET /api/transcripts/queue/stats` - Queue statistics (admin)

### Webhook Integration

```bash
# Auto-queue new recordings
POST /api/recordings/webhook
{
  "callId": "call-123",
  "recordingUrl": "https://storage/recording.wav"
}
```

## 💰 COST ESTIMATION

### OpenAI Pricing

- **Base Cost**: $0.006 per minute of audio
- **Typical Call**: 5 minutes = $0.03
- **1000 calls/day**: ~$30/day
- **10000 calls/day**: ~$300/day

### Infrastructure Costs

- **Redis**: $10-50/month depending on usage
- **Storage**: $5-20/month for temp files
- **Compute**: Existing Railway/server costs

## ✅ PRODUCTION CHECKLIST

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Redis instance deployed and accessible
- [ ] OpenAI API key configured and tested
- [ ] Background worker started and monitored
- [ ] Health checks passing
- [ ] GDPR compliance configured
- [ ] Cost limits set and monitored
- [ ] Audit logging enabled
- [ ] Backup and monitoring in place

---

**🚀 Your Omnivox AI Transcription System is now ready for production!**

The system will automatically process all new recordings and backfill historical calls. Monitor the queue statistics and adjust concurrency based on your volume and performance requirements.