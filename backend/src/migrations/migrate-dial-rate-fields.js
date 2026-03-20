/**
 * Database Migration: Add Real-Time Dial Rate Configuration Fields
 * This script adds all necessary fields for dial rate management to the campaigns table
 */

const { PrismaClient } = require('@prisma/client');

async function migrateDialRateFields() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting dial rate configuration migration...');

    // Check if we're using SQLite (development) or PostgreSQL (production)
    const dbUrl = process.env.DATABASE_URL || '';
    const isSQLite = dbUrl.includes('sqlite') || dbUrl.includes('.db');
    const isPostgreSQL = dbUrl.includes('postgresql') || dbUrl.includes('postgres');

    if (isSQLite) {
      console.log('📦 Detected SQLite database - running SQLite-compatible migration');
      await migrateSQLite(prisma);
    } else if (isPostgreSQL) {
      console.log('🐘 Detected PostgreSQL database - running PostgreSQL migration');
      await migratePostgreSQL(prisma);
    } else {
      console.log('🔄 Running generic SQL migration');
      await migrateGeneric(prisma);
    }

    // Verify migration by checking if all fields exist
    await verifyMigration(prisma);

    console.log('✅ Dial rate configuration migration completed successfully!');
    console.log('📊 Campaign table now includes:');
    console.log('   - dialRate (calls per minute)');
    console.log('   - predictiveRatio (agent-to-call ratio)');
    console.log('   - routingStrategy (round-robin, skill-based, least-busy)');
    console.log('   - answerRateTarget (percentage target)');
    console.log('   - dropRateLimit (maximum allowed percentage)');
    console.log('   - autoAdjustRate (enable/disable auto-adjustment)');
    console.log('   - minDialRate & maxDialRate (rate boundaries)');
    console.log('   - routingPriority & retryDelay configuration');
    console.log('   - lastDialRateUpdate timestamp tracking');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure your database is accessible');
    console.log('2. Check DATABASE_URL environment variable');
    console.log('3. Verify database user has ALTER TABLE permissions');
    console.log('4. For production databases, run this during maintenance window');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateSQLite(prisma) {
  const alterQueries = [
    `ALTER TABLE campaigns ADD COLUMN dialRate REAL DEFAULT 30.0;`,
    `ALTER TABLE campaigns ADD COLUMN predictiveRatio REAL DEFAULT 1.2;`,
    `ALTER TABLE campaigns ADD COLUMN routingStrategy TEXT DEFAULT 'round_robin';`,
    `ALTER TABLE campaigns ADD COLUMN answerRateTarget REAL DEFAULT 0.25;`,
    `ALTER TABLE campaigns ADD COLUMN dropRateLimit REAL DEFAULT 0.05;`,
    `ALTER TABLE campaigns ADD COLUMN autoAdjustRate INTEGER DEFAULT 1;`,
    `ALTER TABLE campaigns ADD COLUMN minDialRate REAL DEFAULT 10.0;`,
    `ALTER TABLE campaigns ADD COLUMN maxDialRate REAL DEFAULT 100.0;`,
    `ALTER TABLE campaigns ADD COLUMN routingPriority TEXT DEFAULT 'balanced';`,
    `ALTER TABLE campaigns ADD COLUMN retryDelay INTEGER DEFAULT 5;`,
    `ALTER TABLE campaigns ADD COLUMN lastDialRateUpdate DATETIME;`
  ];

  for (const query of alterQueries) {
    try {
      await prisma.$executeRawUnsafe(query);
      console.log(`   ✓ ${query.split('ADD COLUMN ')[1]?.split(' ')[0] || 'Field'} added`);
    } catch (error) {
      // Check if column already exists
      if (error.message.includes('duplicate column name') || 
          error.message.includes('already exists')) {
        const columnName = query.split('ADD COLUMN ')[1]?.split(' ')[0];
        console.log(`   ⚠️  Column ${columnName} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }
}

async function migratePostgreSQL(prisma) {
  const alterQueries = [
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "dialRate" DOUBLE PRECISION DEFAULT 30.0;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "predictiveRatio" DOUBLE PRECISION DEFAULT 1.2;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "routingStrategy" TEXT DEFAULT 'round_robin';`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "answerRateTarget" DOUBLE PRECISION DEFAULT 0.25;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "dropRateLimit" DOUBLE PRECISION DEFAULT 0.05;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "autoAdjustRate" BOOLEAN DEFAULT true;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "minDialRate" DOUBLE PRECISION DEFAULT 10.0;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "maxDialRate" DOUBLE PRECISION DEFAULT 100.0;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "routingPriority" TEXT DEFAULT 'balanced';`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "retryDelay" INTEGER DEFAULT 5;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "lastDialRateUpdate" TIMESTAMP;`
  ];

  for (const query of alterQueries) {
    try {
      await prisma.$executeRawUnsafe(query);
      const columnName = query.split('IF NOT EXISTS "')[1]?.split('"')[0];
      console.log(`   ✓ ${columnName} field configured`);
    } catch (error) {
      console.error(`   ❌ Failed to add column: ${error.message}`);
      throw error;
    }
  }

  // Create indexes for performance
  const indexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_campaigns_dial_rate ON campaigns("dialRate");`,
    `CREATE INDEX IF NOT EXISTS idx_campaigns_routing_strategy ON campaigns("routingStrategy");`,
    `CREATE INDEX IF NOT EXISTS idx_campaigns_last_update ON campaigns("lastDialRateUpdate");`
  ];

  console.log('📈 Creating performance indexes...');
  for (const query of indexQueries) {
    try {
      await prisma.$executeRawUnsafe(query);
      const indexName = query.split('idx_campaigns_')[1]?.split(' ')[0];
      console.log(`   ✓ Index created for ${indexName}`);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error(`   ⚠️  Index creation warning: ${error.message}`);
      }
    }
  }
}

async function migrateGeneric(prisma) {
  // Try PostgreSQL-style first, then fallback to basic ALTER TABLE
  try {
    await migratePostgreSQL(prisma);
  } catch (postgresError) {
    console.log('   ℹ️  PostgreSQL migration failed, trying basic SQL...');
    
    const basicQueries = [
      `ALTER TABLE campaigns ADD dialRate DECIMAL(10,2) DEFAULT 30.0;`,
      `ALTER TABLE campaigns ADD predictiveRatio DECIMAL(10,2) DEFAULT 1.2;`,
      `ALTER TABLE campaigns ADD routingStrategy VARCHAR(50) DEFAULT 'round_robin';`,
      `ALTER TABLE campaigns ADD answerRateTarget DECIMAL(5,4) DEFAULT 0.25;`,
      `ALTER TABLE campaigns ADD dropRateLimit DECIMAL(5,4) DEFAULT 0.05;`,
      `ALTER TABLE campaigns ADD autoAdjustRate BOOLEAN DEFAULT true;`,
      `ALTER TABLE campaigns ADD minDialRate DECIMAL(10,2) DEFAULT 10.0;`,
      `ALTER TABLE campaigns ADD maxDialRate DECIMAL(10,2) DEFAULT 100.0;`,
      `ALTER TABLE campaigns ADD routingPriority VARCHAR(50) DEFAULT 'balanced';`,
      `ALTER TABLE campaigns ADD retryDelay INTEGER DEFAULT 5;`,
      `ALTER TABLE campaigns ADD lastDialRateUpdate TIMESTAMP;`
    ];

    for (const query of basicQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
        const columnName = query.split('ADD ')[1]?.split(' ')[0];
        console.log(`   ✓ ${columnName} field added`);
      } catch (error) {
        if (!error.message.includes('Duplicate column name') && 
            !error.message.includes('already exists')) {
          throw error;
        }
        const columnName = query.split('ADD ')[1]?.split(' ')[0];
        console.log(`   ⚠️  Column ${columnName} already exists`);
      }
    }
  }
}

async function verifyMigration(prisma) {
  console.log('🔍 Verifying migration...');
  
  try {
    // Try to query the new fields to verify they exist
    const testQuery = await prisma.$queryRaw`
      SELECT 
        dialRate, 
        predictiveRatio, 
        routingStrategy, 
        answerRateTarget, 
        dropRateLimit,
        autoAdjustRate,
        minDialRate,
        maxDialRate,
        routingPriority,
        retryDelay,
        lastDialRateUpdate
      FROM campaigns 
      LIMIT 1;
    `;
    
    console.log('   ✅ All dial rate configuration fields verified');
    
    // Update existing campaigns with default values if they have NULL values
    const updateResult = await prisma.$executeRaw`
      UPDATE campaigns 
      SET 
        dialRate = COALESCE(dialRate, 30.0),
        predictiveRatio = COALESCE(predictiveRatio, 1.2),
        routingStrategy = COALESCE(routingStrategy, 'round_robin'),
        answerRateTarget = COALESCE(answerRateTarget, 0.25),
        dropRateLimit = COALESCE(dropRateLimit, 0.05),
        autoAdjustRate = COALESCE(autoAdjustRate, true),
        minDialRate = COALESCE(minDialRate, 10.0),
        maxDialRate = COALESCE(maxDialRate, 100.0),
        routingPriority = COALESCE(routingPriority, 'balanced'),
        retryDelay = COALESCE(retryDelay, 5)
      WHERE dialRate IS NULL 
         OR predictiveRatio IS NULL 
         OR routingStrategy IS NULL;
    `;
    
    console.log(`   📊 Updated default values for existing campaigns`);
    
  } catch (error) {
    console.error('   ❌ Verification failed:', error.message);
    throw new Error('Migration verification failed - some fields may be missing');
  }
}

// Additional utility functions
async function rollbackMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Rolling back dial rate configuration migration...');
    
    const dropQueries = [
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS dialRate;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS predictiveRatio;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS routingStrategy;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS answerRateTarget;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS dropRateLimit;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS autoAdjustRate;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS minDialRate;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS maxDialRate;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS routingPriority;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS retryDelay;',
      'ALTER TABLE campaigns DROP COLUMN IF EXISTS lastDialRateUpdate;'
    ];

    for (const query of dropQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
      } catch (error) {
        // Ignore column doesn't exist errors
        if (!error.message.includes("doesn't exist") && 
            !error.message.includes("does not exist")) {
          console.error(`Warning: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackMigration();
  } else {
    migrateDialRateFields();
  }
}

module.exports = {
  migrateDialRateFields,
  rollbackMigration
};