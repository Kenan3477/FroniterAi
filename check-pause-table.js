const mysql = require('mysql2');

// Create connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'zenan',
  password: '',
  database: 'omnivox_dev'
});

async function checkPauseEventsTable() {
  try {
    console.log('🔍 Checking pause_events table...');
    
    // Check if table exists
    const [tables] = await connection.promise().query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'omnivox_dev' 
      AND TABLE_NAME = 'pause_events'
    `);
    
    if (tables.length === 0) {
      console.log('❌ pause_events table does not exist');
      
      // Show all tables
      const [allTables] = await connection.promise().query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'omnivox_dev'
        ORDER BY TABLE_NAME
      `);
      
      console.log('📋 Available tables:');
      allTables.forEach(table => console.log(`  - ${table.TABLE_NAME}`));
      
    } else {
      console.log('✅ pause_events table exists');
      
      // Get table structure
      const [columns] = await connection.promise().query(`
        DESCRIBE pause_events
      `);
      
      console.log('📋 Table structure:');
      console.table(columns);
      
      // Check for records
      const [rows] = await connection.promise().query(`
        SELECT COUNT(*) as count FROM pause_events
      `);
      
      console.log(`📊 Total records: ${rows[0].count}`);
      
      if (rows[0].count > 0) {
        // Show recent records
        const [records] = await connection.promise().query(`
          SELECT id, agent_id, event_type, pause_reason, pause_category, 
                 start_time, end_time, duration, created_at 
          FROM pause_events 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        console.log('📋 Recent pause events:');
        console.table(records);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

checkPauseEventsTable();