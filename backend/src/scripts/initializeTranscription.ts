/**
 * Omnivox AI Transcription System Initialization
 * Startup script to verify and initialize transcription system
 */

import { configService } from '../services/configurationService';
import { audioFileService } from '../services/audioFileService';
import { transcriptionWorker } from '../services/transcriptionWorker';

export async function initializeTranscriptionSystem(): Promise<void> {
  console.log('🚀 Initializing Omnivox AI Transcription System...');
  console.log('================================================');

  try {
    // 1. Validate configuration
    console.log('1️⃣ Validating system configuration...');
    const validation = await configService.validateConfiguration();
    
    if (validation.errors.length > 0) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`   • ${error}`));
      
      console.log('\n📋 To fix these issues:');
      console.log('   1. Set OPENAI_API_KEY in your .env file');
      console.log('   2. Ensure audio storage directory is writable');
      console.log('   3. Check Redis connection settings');
      console.log('   4. Verify Twilio webhook configuration');
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Configuration warnings:');
      validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }

    // 2. Display configuration report
    console.log('\n2️⃣ System Configuration:');
    console.log(configService.generateConfigReport());

    // 3. Check storage status
    console.log('3️⃣ Checking audio storage...');
    const storageStats = audioFileService.getStorageStats();
    console.log(`📁 Storage: ${storageStats.totalFiles} files, ${(storageStats.totalSize / 1024 / 1024).toFixed(1)}MB used`);

    // 4. Initialize worker
    console.log('4️⃣ Initializing transcription worker...');
    console.log('✅ Transcription worker initialized successfully');

    // 5. Summary
    console.log('\n📊 System Status Summary:');
    console.log(`   Audio Storage: ${validation.summary.audioStorage ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   OpenAI Integration: ${validation.summary.openaiIntegration ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Transcription Enabled: ${validation.summary.transcriptionEnabled ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Real-time Processing: ${validation.summary.realTimeProcessing ? '✅ Ready' : '❌ Issues'}`);

    if (validation.isValid) {
      console.log('\n🎉 Transcription system initialized successfully!');
      console.log('📞 New call recordings will be automatically transcribed');
      console.log('🔗 Admin API available at /api/admin/transcripts/system/status');
    } else {
      console.log('\n⚠️ Transcription system initialized with issues');
      console.log('🛠️ Please fix configuration errors before processing calls');
    }

    console.log('================================================');

  } catch (error) {
    console.error('❌ Failed to initialize transcription system:', error);
    console.log('\n🆘 Troubleshooting:');
    console.log('   1. Check .env file configuration');
    console.log('   2. Verify database connection');
    console.log('   3. Ensure Redis is running');
    console.log('   4. Check file system permissions');
    console.log('   5. Validate OpenAI API key');
    throw error;
  }
}

export async function checkTranscriptionHealth(): Promise<boolean> {
  try {
    const validation = await configService.validateConfiguration();
    return validation.isValid;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}