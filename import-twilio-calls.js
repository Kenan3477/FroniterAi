/**
 * Import Twilio Calls and Recordings to Database
 * 
 * This will:
 * 1. Fetch recent calls from Twilio (last 30 days)
 * 2. Fetch recordings for those calls
 * 3. Import into CallRecord table
 * 4. Create Recording entries
 * 5. Link recordings to call records
 */

const { Client } = require('pg');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://zenan:@localhost:5432/omnivox_dev';
const BACKEND_URL = 'https://froniterai-production.up.railway.app';

const DEFAULT_CAMPAIGN_ID = 'dac-campaign-1773926163869';
const DEFAULT_AGENT_ID = 'agent-509';

async function importTwilioCallsAndRecordings() {
  console.log('\n📥 IMPORTING TWILIO CALLS AND RECORDINGS');
  console.log('═══════════════════════════════════════════════════\n');

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('❌ Missing Twilio credentials\n');
    process.exit(1);
  }

  const dbClient = new Client({ connectionString: DATABASE_URL });
  
  try {
    await dbClient.connect();
    console.log('✅ Database connected\n');

    console.log('Step 1: Fetching calls from Twilio API...\n');
    
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const twilioCallsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json?PageSize=1000`,
      { headers: { 'Authorization': `Basic ${auth}` } }
    );

    const twilioCallsData = await twilioCallsResponse.json();
    console.log(`📞 Found ${twilioCallsData.calls.length} calls on Twilio\n`);

    console.log('Step 2: Fetching recordings from Twilio...\n');
    
    const recordingsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings.json?PageSize=1000`,
      { headers: { 'Authorization': `Basic ${auth}` } }
    );

    const recordingsData = await recordingsResponse.json();
    console.log(`📼 Found ${recordingsData.recordings.length} recordings on Twilio\n`);

    const recordingsMap = new Map();
    recordingsData.recordings.forEach(rec => {
      recordingsMap.set(rec.call_sid, rec);
    });

    console.log('Step 3: Importing calls into database...\n');

    let imported = 0;
    let skipped = 0;
    let withRecordings = 0;

    for (const twilioCall of twilioCallsData.calls) {
      try {
        const existingCall = await dbClient.query(
          `SELECT id FROM call_records WHERE "callId" = $1`,
          [twilioCall.sid]
        );

        if (existingCall.rows.length > 0) {
          skipped++;
          continue;
        }

        const outcome = twilioCall.status === 'completed' ? 'completed' :
                       twilioCall.status === 'no-answer' ? 'no-answer' :
                       twilioCall.status;

        const startTime = new Date(twilioCall.start_time);
        const endTime = twilioCall.end_time ? new Date(twilioCall.end_time) : null;
        const duration = twilioCall.duration ? parseInt(twilioCall.duration) : 0;

        const callRecordId = `imported_${twilioCall.sid}`;

        const insertResult = await dbClient.query(`
          INSERT INTO call_records (
            id, "callId", "campaignId", "contactId", "agentId",
            "phoneNumber", "startTime", "endTime", duration, outcome, "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
          )
          RETURNING id
        `, [
          callRecordId,
          twilioCall.sid,
          DEFAULT_CAMPAIGN_ID,
          null,
          DEFAULT_AGENT_ID,
          twilioCall.to || twilioCall.from || 'Unknown',
          startTime,
          endTime,
          duration,
          outcome
        ]);

        const newCallRecordId = insertResult.rows[0].id;
        imported++;

        const recording = recordingsMap.get(twilioCall.sid);
        
        if (recording && recording.status === 'completed') {
          withRecordings++;
          
          const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '')}`;
          const recordingId = `rec_${recording.sid}`;

          await dbClient.query(`
            INSERT INTO recordings (
              id, "callRecordId", "fileName", "filePath", duration,
              format, quality, "storageType", "uploadStatus", "createdAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
            )
          `, [
            recordingId,
            newCallRecordId,
            `${recording.sid}.mp3`,
            recordingUrl,
            parseInt(recording.duration),
            'mp3',
            'standard',
            'twilio',
            'completed'
          ]);

          await dbClient.query(`
            UPDATE call_records
            SET recording = $1
            WHERE id = $2
          `, [
            `${BACKEND_URL}/api/recordings/${newCallRecordId}/stream`,
            newCallRecordId
          ]);

          if (withRecordings % 10 === 0) {
            console.log(`   ✅ Imported ${withRecordings} calls with recordings...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error importing call ${twilioCall.sid}:`, error.message);
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 IMPORT SUMMARY:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Total Twilio calls:     ${twilioCallsData.calls.length}`);
    console.log(`Imported new calls:     ${imported}`);
    console.log(`Skipped (existing):     ${skipped}`);
    console.log(`With recordings:        ${withRecordings}`);
    console.log('');

    if (imported > 0) {
      console.log('✅ SUCCESS: Calls imported!');
      console.log('   Refresh your call history page to see all calls and recordings.\n');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error);
  } finally {
    await dbClient.end();
  }
}

importTwilioCallsAndRecordings();
