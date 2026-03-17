#!/usr/bin/env node
/**
 * Omnivox AI Transcription Worker Startup Script
 * Production-ready background worker for call transcription processing
 */

import { transcriptionWorker } from '../services/transcriptionWorker';
import { prisma } from '../database/index';

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_HOST',
  'TRANSCRIPTION_PROVIDER'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Validate transcription provider configuration
const provider = process.env.TRANSCRIPTION_PROVIDER;
if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required when using OpenAI provider');
  process.exit(1);
}

if (provider === 'self-hosted' && !process.env.WHISPER_SELF_HOSTED_ENDPOINT) {
  console.error('❌ WHISPER_SELF_HOSTED_ENDPOINT is required when using self-hosted provider');
  process.exit(1);
}

async function startTranscriptionWorker() {
  console.log('🚀 Starting Omnivox AI Transcription Worker...');
  console.log(`📊 Provider: ${process.env.TRANSCRIPTION_PROVIDER}`);
  console.log(`🔄 Concurrency: ${process.env.TRANSCRIPTION_CONCURRENCY || 5}`);
  console.log(`🌍 Data Region: ${process.env.DATA_REGION || 'global'}`);
  console.log(`🗃️ Retention: ${process.env.TRANSCRIPT_RETENTION_DAYS || 365} days`);

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start historical backfill if enabled
    if (process.env.ENABLE_HISTORICAL_BACKFILL === 'true') {
      console.log('🔄 Starting historical backfill process...');
      await transcriptionWorker.startHistoricalBackfill({
        batchSize: parseInt(process.env.BATCH_SIZE || '100'),
        skipRecentHours: 1
      });
      console.log('✅ Historical backfill initiated');
    }

    console.log('✅ Transcription worker is ready and processing jobs');
    console.log('💡 Press Ctrl+C to shutdown gracefully');

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start transcription worker:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('\n🛑 Received shutdown signal, gracefully shutting down...');
  
  try {
    await transcriptionWorker.shutdown();
    await prisma.$disconnect();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the worker
startTranscriptionWorker().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});