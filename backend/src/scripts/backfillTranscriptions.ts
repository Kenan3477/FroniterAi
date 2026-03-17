#!/usr/bin/env node
/**
 * Omnivox AI Historical Transcription Backfill Script
 * One-time script to transcribe all existing call recordings
 */

import { PrismaClient } from '@prisma/client';
import { transcriptionWorker } from '../services/transcriptionWorker';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

interface BackfillOptions {
  dryRun: boolean;
  limit: number;
  skipRecentHours: number;
  onlyFailed: boolean;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
}

async function runHistoricalBackfill(options: BackfillOptions = {
  dryRun: false,
  limit: 1000,
  skipRecentHours: 1,
  onlyFailed: false
}) {
  
  console.log('🔄 Omnivox AI Historical Transcription Backfill');
  console.log('===============================================');
  console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`Limit: ${options.limit}`);
  console.log(`Skip Recent Hours: ${options.skipRecentHours}`);
  console.log(`Only Failed: ${options.onlyFailed ? 'YES' : 'NO'}`);
  
  if (options.campaignId) {
    console.log(`Campaign Filter: ${options.campaignId}`);
  }
  
  if (options.dateFrom || options.dateTo) {
    console.log(`Date Range: ${options.dateFrom || 'earliest'} to ${options.dateTo || 'latest'}`);
  }
  
  console.log('\n');

  try {
    // Build where conditions
    const whereConditions: any = {
      duration: { gt: 5 }, // Only calls longer than 5 seconds
    };

    // Skip recent calls to avoid conflicts with real-time processing
    if (options.skipRecentHours > 0) {
      const cutoffTime = new Date(Date.now() - options.skipRecentHours * 60 * 60 * 1000);
      whereConditions.createdAt = { lt: cutoffTime };
    }

    // Date range filter
    if (options.dateFrom || options.dateTo) {
      if (!whereConditions.createdAt) whereConditions.createdAt = {};
      if (options.dateFrom) {
        whereConditions.createdAt.gte = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        whereConditions.createdAt.lte = new Date(options.dateTo);
      }
    }

    // Campaign filter
    if (options.campaignId) {
      whereConditions.campaignId = options.campaignId;
    }

    // Transcription status filter
    if (options.onlyFailed) {
      whereConditions.transcriptionStatus = 'failed';
    } else {
      whereConditions.OR = [
        { transcriptionStatus: null },
        { transcriptionStatus: 'failed' },
        { transcriptionStatus: 'queued' } // Re-queue stuck jobs
      ];
    }

    // Must have recording available
    whereConditions.OR = [
      { recording: { not: null } },
      { recordingFile: { isNot: null } }
    ];

    // Find eligible calls
    const eligibleCalls = await prisma.callRecord.findMany({
      where: whereConditions,
      include: {
        recordingFile: {
          select: { filePath: true, uploadStatus: true }
        },
        contact: {
          select: { firstName: true, lastName: true, phone: true }
        },
        campaign: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit
    });

    console.log(`📊 Found ${eligibleCalls.length} calls eligible for transcription:`);
    console.log('');

    if (eligibleCalls.length === 0) {
      console.log('✅ No calls need transcription. All done!');
      return;
    }

    // Group by status for summary
    const statusSummary = eligibleCalls.reduce((acc: any, call) => {
      const status = (call as any).transcriptionStatus || 'not_started';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Status Breakdown:');
    Object.entries(statusSummary).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} calls`);
    });
    console.log('');

    if (options.dryRun) {
      console.log('🔍 DRY RUN - Would process the following calls:');
      eligibleCalls.slice(0, 10).forEach((call, index) => {
        const recordingUrl = call.recordingFile?.filePath || call.recording;
        console.log(`   ${index + 1}. ${call.callId} - ${call.contact?.phone || 'Unknown'} - ${recordingUrl ? 'Has Recording' : 'No Recording'}`);
      });
      
      if (eligibleCalls.length > 10) {
        console.log(`   ... and ${eligibleCalls.length - 10} more calls`);
      }
      console.log('');
      console.log('💡 Run with --execute to actually queue transcription jobs');
      return;
    }

    // Confirm execution
    console.log('⚠️  This will queue transcription jobs for all eligible calls.');
    console.log('💰 Estimated cost (OpenAI): $' + (eligibleCalls.length * 0.03).toFixed(2)); // Assuming 5min avg
    console.log('');

    // Process calls in batches
    const batchSize = 50;
    let processed = 0;
    let queued = 0;
    let errors = 0;

    for (let i = 0; i < eligibleCalls.length; i += batchSize) {
      const batch = eligibleCalls.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(eligibleCalls.length / batchSize)} (${batch.length} calls)...`);

      for (const call of batch) {
        try {
          const recordingUrl = call.recordingFile?.filePath || call.recording;
          
          if (!recordingUrl) {
            console.log(`   ⚠️ Skipped ${call.callId}: No recording available`);
            continue;
          }

          // Only queue if recording upload is complete
          if (call.recordingFile && call.recordingFile.uploadStatus !== 'completed') {
            console.log(`   ⚠️ Skipped ${call.callId}: Recording upload not complete`);
            continue;
          }

          await transcriptionWorker.addTranscriptionJob(call.id, recordingUrl, {
            priority: 200, // Lower priority for backfill
            jobType: 'backfill'
          });

          // Update call status
          await prisma.callRecord.update({
            where: { id: call.id },
            data: { transcriptionStatus: 'queued' }
          });

          queued++;
          console.log(`   ✅ Queued ${call.callId} (${call.contact?.phone || 'Unknown'})`);

        } catch (error) {
          errors++;
          console.error(`   ❌ Error queuing ${call.callId}:`, error instanceof Error ? error.message : 'Unknown error');
        }

        processed++;

        // Small delay to prevent overwhelming the system
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Batch delay
      if (i + batchSize < eligibleCalls.length) {
        console.log('   ⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('');
    console.log('📊 BACKFILL SUMMARY:');
    console.log('==================');
    console.log(`Total Processed: ${processed}`);
    console.log(`Successfully Queued: ${queued}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success Rate: ${processed > 0 ? Math.round((queued / processed) * 100) : 0}%`);
    
    if (queued > 0) {
      console.log('');
      console.log('✅ Historical backfill complete! Transcription jobs are now queued.');
      console.log('💡 Monitor progress with: GET /api/transcripts/queue/stats');
      console.log('⏱️ Estimated completion time: ' + Math.ceil(queued / 5) + ' minutes (assuming 5 concurrent workers)');
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: BackfillOptions = {
    dryRun: !args.includes('--execute'),
    limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '1000'),
    skipRecentHours: parseInt(args.find(arg => arg.startsWith('--skip-recent='))?.split('=')[1] || '1'),
    onlyFailed: args.includes('--only-failed'),
    campaignId: args.find(arg => arg.startsWith('--campaign='))?.split('=')[1],
    dateFrom: args.find(arg => arg.startsWith('--date-from='))?.split('=')[1],
    dateTo: args.find(arg => arg.startsWith('--date-to='))?.split('=')[1]
  };

  if (args.includes('--help')) {
    console.log(`
Omnivox AI Historical Transcription Backfill

Usage: npm run backfill-transcriptions [options]

Options:
  --execute              Actually queue jobs (default: dry run)
  --limit=N              Limit to N calls (default: 1000)
  --skip-recent=N        Skip calls from last N hours (default: 1)
  --only-failed          Only retry failed transcriptions
  --campaign=ID          Only process specific campaign
  --date-from=YYYY-MM-DD Process calls from this date
  --date-to=YYYY-MM-DD   Process calls until this date
  --help                 Show this help

Examples:
  # Dry run (preview what would be processed)
  npm run backfill-transcriptions

  # Actually process 500 calls
  npm run backfill-transcriptions --execute --limit=500

  # Retry only failed transcriptions
  npm run backfill-transcriptions --execute --only-failed

  # Process specific date range
  npm run backfill-transcriptions --execute --date-from=2024-01-01 --date-to=2024-01-31
    `);
    return;
  }

  try {
    await runHistoricalBackfill(options);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}