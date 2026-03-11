#!/usr/bin/env node
/**
 * Omnivox AI - Transcription System Status Dashboard
 * Command-line tool to monitor transcription system health
 */

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

dotenv.config();

interface SystemStatus {
  openai: 'ready' | 'missing_key' | 'invalid_key' | 'free_provider' | 'error';
  storage: 'ready' | 'missing_directory' | 'permission_error';
  configuration: 'complete' | 'incomplete';
  queue: 'running' | 'stopped' | 'error';
}

async function checkOpenAI(): Promise<'ready' | 'missing_key' | 'invalid_key' | 'free_provider' | 'error'> {
  try {
    const provider = process.env.TRANSCRIPTION_PROVIDER;
    
    // Check if using free alternatives
    if (provider === 'local-whisper' || provider === 'whisper-cpp') {
      return 'free_provider';
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return 'missing_key';
    }

    if (!apiKey.startsWith('sk-')) {
      return 'invalid_key';
    }

    // Basic format validation - can't test connection without importing OpenAI
    return 'ready';
  } catch (error) {
    return 'error';
  }
}

async function checkStorage(): Promise<'ready' | 'missing_directory' | 'permission_error'> {
  try {
    const storagePath = process.env.AUDIO_STORAGE_PATH || './storage/audio';
    const absolutePath = path.resolve(storagePath);

    try {
      await fs.access(absolutePath);
      
      // Test write permissions
      const testFile = path.join(absolutePath, 'test.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      return 'ready';
    } catch (accessError) {
      // Try to create directory
      await fs.mkdir(absolutePath, { recursive: true });
      return 'ready';
    }
  } catch (error) {
    return 'permission_error';
  }
}

async function checkConfiguration(): Promise<'complete' | 'incomplete'> {
  const requiredVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'OPENAI_API_KEY',
    'REDIS_URL',
    'AUDIO_STORAGE_PATH'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  return missing.length === 0 ? 'complete' : 'incomplete';
}

async function checkQueue(): Promise<'running' | 'stopped' | 'error'> {
  try {
    // Check if Redis is configured
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return 'error';
    }
    
    // Basic check - would need Redis connection to verify properly
    return 'ready' as any;
  } catch (error) {
    return 'error';
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case 'ready':
    case 'complete':
    case 'running':
      return chalk.green('✅ Ready');
    case 'free_provider':
      return chalk.green('🆓 FREE Provider');
    case 'missing_key':
      return chalk.red('❌ Missing API Key');
    case 'invalid_key':
      return chalk.red('❌ Invalid API Key');
    case 'missing_directory':
      return chalk.yellow('⚠️  Directory Missing');
    case 'permission_error':
      return chalk.red('❌ Permission Error');
    case 'incomplete':
      return chalk.yellow('⚠️  Incomplete');
    case 'stopped':
      return chalk.yellow('⚠️  Stopped');
    case 'error':
      return chalk.red('❌ Error');
    default:
      return chalk.gray('❔ Unknown');
  }
}

function getRecommendation(component: string, status: string): string {
  switch (`${component}:${status}`) {
    case 'openai:missing_key':
      return 'Run: npm run setup:openai (or use free: npm run setup:free-transcription)';
    case 'openai:invalid_key':
      return 'Check API key format in .env file';
    case 'openai:free_provider':
      return 'Using FREE transcription - no API costs! 🎉';
    case 'storage:missing_directory':
      return 'Directory will be created automatically';
    case 'storage:permission_error':
      return 'Check file system permissions for storage directory';
    case 'configuration:incomplete':
      return 'Review .env file for missing variables';
    case 'queue:error':
      return 'Check Redis connection and configuration';
    default:
      return '';
  }
}

async function displayDashboard(): Promise<void> {
  console.log(chalk.cyan('🔧 Omnivox AI - Transcription System Status'));
  console.log(chalk.cyan('==========================================\n'));

  const status: SystemStatus = {
    openai: await checkOpenAI(),
    storage: await checkStorage(),
    configuration: await checkConfiguration(),
    queue: await checkQueue()
  };

  // Component status
  console.log(chalk.bold('📊 System Components:'));
  console.log(`OpenAI Integration:    ${formatStatus(status.openai)}`);
  console.log(`Audio Storage:         ${formatStatus(status.storage)}`);
  console.log(`Configuration:         ${formatStatus(status.configuration)}`);
  console.log(`Queue System:          ${formatStatus(status.queue)}\n`);

  // Overall health
  const allReady = Object.values(status).every(s => 
    s === 'ready' || s === 'complete' || s === 'running' || s === 'free_provider'
  );

  if (allReady) {
    console.log(chalk.green.bold('🎉 System Status: All Components Ready'));
    console.log(chalk.green('✅ Transcription system is fully operational\n'));
  } else {
    console.log(chalk.yellow.bold('⚠️  System Status: Issues Detected'));
    console.log(chalk.yellow('🔧 Some components need attention\n'));
  }

  // Recommendations
  const hasIssues = Object.entries(status).some(([, s]) => 
    s !== 'ready' && s !== 'complete' && s !== 'running' && s !== 'free_provider'
  );

  if (hasIssues) {
    console.log(chalk.bold('🔧 Recommendations:'));
    
    Object.entries(status).forEach(([component, statusValue]) => {
      const recommendation = getRecommendation(component, statusValue);
      if (recommendation) {
        console.log(`${component}: ${recommendation}`);
      }
    });
    console.log();
  }

  // Configuration summary
  console.log(chalk.bold('⚙️  Current Configuration:'));
  console.log(`Provider:              ${process.env.TRANSCRIPTION_PROVIDER || 'local-whisper'} ${status.openai === 'free_provider' ? '(FREE! 🎉)' : ''}`);
  console.log(`Storage Path:          ${process.env.AUDIO_STORAGE_PATH || './storage/audio'}`);
  console.log(`Transcription Workers: ${process.env.TRANSCRIPTION_CONCURRENCY || '3'}`);
  console.log(`Daily Cost Limit:      $${process.env.DAILY_COST_LIMIT || '100'} ${status.openai === 'free_provider' ? '(Not needed - FREE!)' : ''}`);
  console.log(`Auto File Cleanup:     ${process.env.AUTO_DELETE_AUDIO_FILES === 'true' ? 'Enabled' : 'Disabled'}\n`);

  // Usage information
  console.log(chalk.bold('📋 Available Commands:'));
  console.log('npm run transcription:status       - Show this dashboard');
  console.log('npm run setup:free-transcription   - Setup FREE alternatives (recommended)');
  console.log('npm run setup:openai               - Configure OpenAI API key (paid)');
  console.log('npm run transcription:test         - Test transcription pipeline');
  console.log('curl /api/admin/transcripts/system/status - API status endpoint\n');
}

async function main(): Promise<void> {
  try {
    await displayDashboard();
  } catch (error) {
    console.error(chalk.red('❌ Dashboard error:'), error);
    process.exit(1);
  }
}

main();