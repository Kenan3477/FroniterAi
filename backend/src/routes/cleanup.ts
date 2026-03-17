import { Router } from 'express';
import { prisma } from '../database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * ADMIN ONLY: Emergency cleanup endpoint to remove test inbound numbers
 * This should only be used to clean up test data from production database
 */
router.post('/cleanup-test-numbers', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('🚨 ADMIN CLEANUP: Starting test numbers removal...');
    
    // List current numbers before cleanup
    const beforeNumbers = await prisma.inboundNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    });
    
    console.log('📊 Numbers before cleanup:', beforeNumbers.length);
    beforeNumbers.forEach(num => {
      console.log(`   - ${num.phoneNumber} (${num.displayName})`);
    });
    
    // Delete test numbers - keep only the real Twilio number
    const testNumbersToDelete = ['+447700900123', '+14155552456', '+15551234567'];
    let totalDeleted = 0;
    
    for (const phoneNumber of testNumbersToDelete) {
      const deleteResult = await prisma.inboundNumber.deleteMany({
        where: { phoneNumber }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} records for ${phoneNumber}`);
      totalDeleted += deleteResult.count;
    }
    
    // Verify final state
    const afterNumbers = await prisma.inboundNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    });
    
    console.log('📊 Numbers after cleanup:', afterNumbers.length);
    afterNumbers.forEach(num => {
      console.log(`   - ${num.phoneNumber} (${num.displayName})`);
    });
    
    res.json({
      success: true,
      message: 'Test numbers cleanup completed',
      stats: {
        before: beforeNumbers.length,
        deleted: totalDeleted,
        after: afterNumbers.length,
        remaining: afterNumbers.map(n => ({
          phoneNumber: n.phoneNumber,
          displayName: n.displayName
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup test numbers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ADMIN ONLY: Cleanup demo/test call records  
 * Removes call records that are not from real Twilio calls
 */
router.post('/cleanup-demo-records', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('🚨 ADMIN CLEANUP: Starting demo call records removal...');
    
    // List current call records before cleanup
    const beforeRecords = await prisma.callRecord.findMany({
      orderBy: { startTime: 'desc' },
      take: 20 // Show recent records for review
    });
    
    console.log('📊 Call records before cleanup:', beforeRecords.length);
    beforeRecords.forEach(record => {
      console.log(`   - ${record.phoneNumber} (${record.callType}) - ${record.startTime}`);
    });
    
    // Define criteria for demo/test records to remove
    const demoPhoneNumbers = ['+1234567890', '+447700900123', '+14155552456', '+15551234567'];
    const demoCallIds = ['DEMO-CALL-001', 'DEMO-CALL-002', 'CALL-2026-001', 'CALL-2026-002', 'CALL-2026-003'];
    
    // Delete demo records by phone numbers
    let totalDeleted = 0;
    
    for (const phoneNumber of demoPhoneNumbers) {
      const deleteResult = await prisma.callRecord.deleteMany({
        where: { phoneNumber }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} call records for ${phoneNumber}`);
      totalDeleted += deleteResult.count;
    }
    
    // Delete demo records by call IDs  
    for (const callId of demoCallIds) {
      const deleteResult = await prisma.callRecord.deleteMany({
        where: { callId }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} call records for callId ${callId}`);
      totalDeleted += deleteResult.count;
    }
    
    // Delete any records with 'demo' or 'test' in various fields (case insensitive)
    const demoByContent = await prisma.callRecord.deleteMany({
      where: {
        OR: [
          { notes: { contains: 'demo', mode: 'insensitive' } },
          { notes: { contains: 'test', mode: 'insensitive' } },
          { callId: { contains: 'demo', mode: 'insensitive' } },
          { callId: { contains: 'test', mode: 'insensitive' } },
          { campaignId: { contains: 'demo', mode: 'insensitive' } },
          { campaignId: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`✅ Deleted ${demoByContent.count} additional demo records by content`);
    totalDeleted += demoByContent.count;
    
    // Verify final state - show remaining records
    const afterRecords = await prisma.callRecord.findMany({
      orderBy: { startTime: 'desc' }
    });
    
    console.log('📊 Call records after cleanup:', afterRecords.length);
    afterRecords.forEach(record => {
      console.log(`   - ${record.phoneNumber} (${record.callType}) - ${record.startTime}`);
    });
    
    res.json({
      success: true,
      message: 'Demo call records cleanup completed',
      stats: {
        totalDeleted,
        remainingRecords: afterRecords.length,
        remaining: afterRecords.map(r => ({
          phoneNumber: r.phoneNumber,
          callType: r.callType,
          startTime: r.startTime,
          callId: r.callId
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Demo cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup demo call records',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ADMIN ONLY: Comprehensive Twilio recordings sync
 * Fetches ALL recordings from Twilio and creates database entries
 */
router.post('/sync-twilio-recordings', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('🚨 ADMIN SYNC: Starting comprehensive Twilio recordings sync...');
    
    // Import the comprehensive sync function
    const { syncAllTwilioRecordings } = require('../services/comprehensiveRecordingSync');
    const { syncAllRecordings } = require('../services/recordingSyncService');
    
    // First try comprehensive sync (gets ALL Twilio recordings)
    console.log('🔄 Phase 1: Comprehensive Twilio sync...');
    const comprehensiveResult = await syncAllTwilioRecordings();
    console.log('📊 Comprehensive sync results:', comprehensiveResult);
    
    // Then try normal sync for any remaining missing recordings
    console.log('🔄 Phase 2: Normal recording sync...');
    const normalResult = await syncAllRecordings();
    console.log('📊 Normal sync results:', normalResult);
    
    // Then do aggressive sync for missing files
    console.log('� Phase 3: Missing file re-download...');
    const callRecordsWithRecordings = await prisma.callRecord.findMany({
      where: {
        recordingFile: {
          isNot: null
        }
      },
      include: {
        recordingFile: true
      }
    });
    
    console.log(`📊 Found ${callRecordsWithRecordings.length} call records with recording links`);
    
    let reDownloaded = 0;
    let errors = 0;
    
    for (const record of callRecordsWithRecordings) {
      if (record.recordingFile) {
        const filePath = record.recordingFile.filePath;
        console.log(`🔍 Checking file: ${filePath}`);
        
        // Check if physical file exists
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.resolve(filePath);
        
        try {
          await fs.promises.access(fullPath);
          console.log(`✅ File exists: ${filePath}`);
        } catch (error) {
          console.log(`❌ File missing: ${filePath} - attempting re-download`);
          
          // Try to extract Twilio SID from filename
          try {
            // Example filename: CA223b31bd3d82b81f2869e724936e2ad1_2026-02-16T12-49-00-182Z.mp3
            const fileName = record.recordingFile.fileName;
            const twilioSid = fileName.split('_')[0]; // Extract the part before first underscore
            
            if (twilioSid && twilioSid.startsWith('CA')) {
              console.log(`🔄 Re-downloading recording: ${twilioSid}`);
              
              // Use the recording service to re-download
              const { downloadRecordingFromTwilio } = require('../services/recordingService');
              await downloadRecordingFromTwilio(twilioSid, filePath);
              
              reDownloaded++;
              console.log(`✅ Re-downloaded: ${twilioSid}`);
            } else {
              console.log(`❌ Could not extract Twilio SID from filename: ${fileName}`);
              errors++;
            }
          } catch (downloadError) {
            console.error(`❌ Failed to re-download from filename ${record.recordingFile.fileName}:`, downloadError);
            errors++;
          }
        }
      }
    }
    
    const totalResult = {
      comprehensiveSync: comprehensiveResult,
      normalSync: normalResult,
      reDownloaded: reDownloaded,
      errors: errors,
      summary: {
        totalTwilioRecordings: comprehensiveResult.totalTwilioRecordings,
        newCallRecords: comprehensiveResult.newCallRecords,
        newRecordingFiles: comprehensiveResult.newRecordingFiles,
        linkedExisting: comprehensiveResult.linkedExisting,
        normalSynced: normalResult.synced,
        reDownloaded: reDownloaded,
        totalErrors: comprehensiveResult.errors + normalResult.errors + errors
      }
    };
    
    console.log('📊 Complete comprehensive Twilio sync results:', totalResult);
    
    res.json({
      success: true,
      message: 'Comprehensive Twilio recordings sync completed',
      stats: totalResult
    });
    
  } catch (error) {
    console.error('❌ Comprehensive Twilio sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Twilio recordings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;