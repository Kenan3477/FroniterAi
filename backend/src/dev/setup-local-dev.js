/**
 * Local Development Environment Setup for Dial Rate Management Testing
 * This script sets up a local SQLite database with test data for dial rate system testing
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function setupLocalDevelopment() {
  // Use local SQLite database for development
  const localDbPath = path.join(__dirname, '../../data/local-dev.db');
  process.env.DATABASE_URL = `file:${localDbPath}`;
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🚀 Setting up local development environment...');
    console.log(`📁 Database location: ${localDbPath}`);

    // Create data directory if it doesn't exist
    const fs = require('fs');
    const dataDir = path.dirname(localDbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }

    // Run Prisma migrations first
    console.log('📊 Running Prisma schema migration...');
    const { execSync } = require('child_process');
    
    try {
      process.chdir('/Users/zenan/kennex/backend');
      execSync('npx prisma db push --force-reset', { 
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: `file:${localDbPath}` }
      });
      console.log('✅ Prisma schema applied successfully');
    } catch (migrationError) {
      console.log('⚠️  Prisma migration had issues, continuing with manual setup...');
      console.log(migrationError.message);
    }

    // Create tables manually if needed
    await createTablesIfNeeded(prisma);
    
    // Add dial rate configuration fields
    await addDialRateFields(prisma);

    // Create test data
    await createTestData(prisma);

    console.log('✅ Local development environment setup complete!');
    console.log('\n🎯 Test the dial rate management system with:');
    console.log('   - Campaign: "Test Auto-Dialler Campaign"');
    console.log('   - Agent: "test-agent" (password: testpass123)');
    console.log('   - Database: SQLite at data/local-dev.db');
    
    console.log('\n🚀 To start the backend server with local database:');
    console.log(`   export DATABASE_URL="file:${localDbPath}"`);
    console.log('   cd backend && npm start');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createTablesIfNeeded(prisma) {
  console.log('🏗️  Creating database tables...');
  
  const createTableQueries = [
    `CREATE TABLE IF NOT EXISTS campaigns (
      campaignId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'Inactive',
      dialMethod TEXT DEFAULT 'manual',
      speed INTEGER DEFAULT 1,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      dialRate REAL DEFAULT 30.0,
      predictiveRatio REAL DEFAULT 1.2,
      routingStrategy TEXT DEFAULT 'round_robin',
      answerRateTarget REAL DEFAULT 0.25,
      dropRateLimit REAL DEFAULT 0.05,
      autoAdjustRate INTEGER DEFAULT 1,
      minDialRate REAL DEFAULT 10.0,
      maxDialRate REAL DEFAULT 100.0,
      routingPriority TEXT DEFAULT 'balanced',
      retryDelay INTEGER DEFAULT 5,
      lastDialRateUpdate DATETIME
    );`,
    
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'agent',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    
    `CREATE TABLE IF NOT EXISTS contacts (
      contactId TEXT PRIMARY KEY,
      campaignId TEXT,
      firstName TEXT,
      lastName TEXT,
      phoneNumber TEXT,
      status TEXT DEFAULT 'available',
      priority INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaignId) REFERENCES campaigns(campaignId)
    );`,

    `CREATE TABLE IF NOT EXISTS call_records (
      id TEXT PRIMARY KEY,
      campaignId TEXT,
      contactId TEXT,
      agentId TEXT,
      phoneNumber TEXT,
      callStatus TEXT,
      callDuration INTEGER DEFAULT 0,
      callOutcome TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaignId) REFERENCES campaigns(campaignId),
      FOREIGN KEY (contactId) REFERENCES contacts(contactId)
    );`,

    `CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      agentId TEXT NOT NULL,
      campaignId TEXT,
      status TEXT DEFAULT 'available',
      lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
      totalCalls INTEGER DEFAULT 0,
      FOREIGN KEY (campaignId) REFERENCES campaigns(campaignId)
    );`
  ];

  for (const query of createTableQueries) {
    try {
      await prisma.$executeRawUnsafe(query);
      const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`   ✓ Table ${tableName} ready`);
    } catch (error) {
      console.error(`   ❌ Failed to create table: ${error.message}`);
    }
  }
}

async function addDialRateFields(prisma) {
  console.log('📊 Adding dial rate configuration fields...');
  
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
      const columnName = query.split('ADD COLUMN ')[1]?.split(' ')[0];
      console.log(`   ✓ ${columnName} field added`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        const columnName = query.split('ADD COLUMN ')[1]?.split(' ')[0];
        console.log(`   ⚠️  Column ${columnName} already exists`);
      } else {
        console.error(`   ⚠️  ${error.message}`);
      }
    }
  }
}

async function createTestData(prisma) {
  console.log('🧪 Creating test data...');

  // Create test campaign
  try {
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO campaigns (
        campaignId, name, status, dialMethod, speed, description,
        dialRate, predictiveRatio, routingStrategy, answerRateTarget, 
        dropRateLimit, autoAdjustRate, minDialRate, maxDialRate,
        routingPriority, retryDelay
      ) VALUES (
        'camp_test_001',
        'Test Auto-Dialler Campaign', 
        'Active',
        'auto',
        1,
        'Test campaign for dial rate management system',
        35.0,
        1.5,
        'round_robin',
        0.30,
        0.03,
        1,
        15.0,
        80.0,
        'balanced',
        3
      );
    `;
    console.log('   ✓ Test campaign created');
  } catch (error) {
    console.log(`   ⚠️  Campaign creation: ${error.message}`);
  }

  // Create test user/agent
  try {
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO users (
        id, username, password, role
      ) VALUES (
        'agent_test_001',
        'test-agent',
        '$2b$10$rQs7EJ3LzxA4zU8W0v4oReOyP9BZUg.8E0l.aM2Y6xQ5bS7Qz.E8G',
        'agent'
      );
    `;
    console.log('   ✓ Test agent created (username: test-agent, password: testpass123)');
  } catch (error) {
    console.log(`   ⚠️  Agent creation: ${error.message}`);
  }

  // Create test contacts
  try {
    const testContacts = [
      { id: 'contact_001', phone: '+1234567001', first: 'John', last: 'Doe' },
      { id: 'contact_002', phone: '+1234567002', first: 'Jane', last: 'Smith' },
      { id: 'contact_003', phone: '+1234567003', first: 'Bob', last: 'Johnson' },
      { id: 'contact_004', phone: '+1234567004', first: 'Alice', last: 'Wilson' },
      { id: 'contact_005', phone: '+1234567005', first: 'Mike', last: 'Davis' },
    ];

    for (const contact of testContacts) {
      await prisma.$executeRaw`
        INSERT OR REPLACE INTO contacts (
          contactId, campaignId, firstName, lastName, phoneNumber, status, priority
        ) VALUES (
          ${contact.id},
          'camp_test_001',
          ${contact.first},
          ${contact.last},
          ${contact.phone},
          'available',
          1
        );
      `;
    }
    console.log(`   ✓ ${testContacts.length} test contacts created`);
  } catch (error) {
    console.log(`   ⚠️  Contact creation: ${error.message}`);
  }

  // Create test agent session
  try {
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO agent_sessions (
        id, agentId, campaignId, status, totalCalls
      ) VALUES (
        'session_001',
        'agent_test_001',
        'camp_test_001',
        'available',
        0
      );
    `;
    console.log('   ✓ Test agent session created');
  } catch (error) {
    console.log(`   ⚠️  Agent session creation: ${error.message}`);
  }
}

// Utility function to reset development database
async function resetDevelopmentDatabase() {
  const localDbPath = path.join(__dirname, '../../data/local-dev.db');
  const fs = require('fs');
  
  if (fs.existsSync(localDbPath)) {
    fs.unlinkSync(localDbPath);
    console.log('🗑️  Removed existing development database');
  }
  
  await setupLocalDevelopment();
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'reset') {
    resetDevelopmentDatabase();
  } else {
    setupLocalDevelopment();
  }
}

module.exports = {
  setupLocalDevelopment,
  resetDevelopmentDatabase
};