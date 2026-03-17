const mysql = require('mysql2/promise');

async function checkAgentAndCreateTestData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'zenan',
    password: '',
    database: 'omnivox_dev'
  });

  try {
    console.log('🔍 Checking agent records...');
    
    // Check agents table
    const [agents] = await connection.execute('SELECT * FROM agents LIMIT 10');
    console.log(`📊 Total agents: ${agents.length}`);
    
    if (agents.length > 0) {
      console.log('✅ Found agents:');
      agents.forEach((agent, index) => {
        console.log(`${index + 1}. ID: ${agent.id}, AgentID: ${agent.agentId}, Name: ${agent.firstName} ${agent.lastName}, Email: ${agent.email}`);
      });
    } else {
      console.log('❌ No agent records found');
    }
    
    // Check users table to see your user
    console.log('\n🔍 Checking user records...');
    const [users] = await connection.execute('SELECT id, username, firstName, lastName, email, role FROM users WHERE id = 509 OR username = "ken"');
    
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ Found your user:');
      console.log(`   ID: ${user.id}, Username: ${user.username}, Name: ${user.firstName} ${user.lastName}, Role: ${user.role}`);
      
      // Check if there's a corresponding agent record
      const [userAgent] = await connection.execute('SELECT * FROM agents WHERE agentId = ?', [user.id.toString()]);
      
      if (userAgent.length === 0) {
        console.log('❌ No agent record found for your user');
        console.log('🔧 Creating agent record...');
        
        try {
          const agentId = `agent_${user.id}`;
          await connection.execute(`
            INSERT INTO agents (id, agentId, firstName, lastName, email, status, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, 'Available', NOW(), NOW())
          `, [agentId, user.id.toString(), user.firstName || 'Ken', user.lastName || 'User', user.email]);
          
          console.log('✅ Created agent record with agentId:', user.id.toString());
        } catch (error) {
          console.log('❌ Error creating agent record:', error.message);
        }
      } else {
        console.log('✅ Agent record exists for your user');
      }
    }
    
    // Now check pause events
    console.log('\n🔍 Checking pause events...');
    const [pauseEvents] = await connection.execute('SELECT * FROM agent_pause_events ORDER BY createdAt DESC LIMIT 5');
    console.log(`📊 Total pause events: ${pauseEvents.length}`);
    
    if (pauseEvents.length === 0) {
      console.log('❌ No pause events found');
      
      // Create a test pause event
      if (users.length > 0) {
        console.log('🧪 Creating test pause event...');
        try {
          const startTime = new Date();
          const endTime = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 minutes later
          
          await connection.execute(`
            INSERT INTO agent_pause_events 
            (id, agentId, eventType, pauseReason, pauseCategory, startTime, endTime, duration, agentComment, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            `pause_${Date.now()}`,
            users[0].id.toString(), 
            'break',
            'Toilet Break',
            'personal',
            startTime,
            endTime,
            300, // 5 minutes
            'Test pause event for debugging'
          ]);
          
          console.log('✅ Created test pause event');
        } catch (error) {
          console.log('❌ Error creating test pause event:', error.message);
        }
      }
    } else {
      console.log('✅ Found pause events:');
      pauseEvents.forEach((event, index) => {
        console.log(`${index + 1}. AgentID: ${event.agentId}, Type: ${event.eventType}, Reason: ${event.pauseReason}, Duration: ${event.duration}s`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAgentAndCreateTestData();