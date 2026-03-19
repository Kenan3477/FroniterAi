/**
 * Add migration endpoint to admin routes
 */

import { Router } from 'express';
import { requireRole } from '../middleware/auth';

const router = Router();

// Migration endpoint to fix recording storage types
router.post('/migrate-storage-types', requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('🔧 Starting recording storage type migration...');
    
    // Import the migration function
    const { migrateRecordingStorageTypes } = require('../scripts/migrate-recording-storage-types');
    
    // Run the migration
    await migrateRecordingStorageTypes();
    
    console.log('✅ Migration completed successfully');
    
    res.json({
      success: true,
      message: 'Recording storage types migrated successfully',
      details: 'All recordings now have storageType = "twilio"'
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: errorMessage
    });
  }
});

// AI Analytics Migration endpoint
router.post('/ai-analytics', async (req, res) => {
  try {
    console.log('🚀 Starting AI Analytics schema migration...');
    
    // Import the migration function
    const { migrateAIAnalytics } = require('../database/migrate-ai-analytics');
    
    // Run the migration
    const result = await migrateAIAnalytics();
    
    console.log('✅ AI Analytics migration completed successfully');
    
    res.json({
      success: true,
      message: 'AI Analytics schema migration completed successfully',
      details: result
    });
    
  } catch (error) {
    console.error('❌ AI Analytics migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    res.status(500).json({
      success: false,
      error: 'AI Analytics migration failed',
      message: errorMessage
    });
  }
});

export default router;