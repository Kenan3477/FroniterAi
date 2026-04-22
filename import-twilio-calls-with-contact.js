const { Client } = require('pg');
const { createId } = require('@paralleldrive/cuid2');

// Configuration
const DATABASE_URL = 'postgresql://zenan:@localhost:5432/omnivox_dev';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const DEFAULT_CAMPAIGN_ID = 'dac-campaign-1773926163869';
const DEFAULT_AGENT_ID = 'agent-509';
const UNKNOWN_CONTACT_ID = 'unknown-contact-imported';
const DEFAULT_LIST_ID = 'test-list-1'; // Using existing test list

// Check required environment variables
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   TWILIO_ACCOUNT_SID');
  console.error('   TWILIO_AUTH_TOKEN');
  process.exit(1);
}

async function main() {
  const dbClient = new Client({ connectionString: DATABASE_URL });
  
  try {
    await dbClient.connect();
    console.log('✅ Connected to database');

    // Step 1: Create or get unknown contact
    console.log('\n📝 Creating placeholder contact...');
    const contactCheck = await dbClient.query(
      `SELECT "contactId" FROM contacts WHERE "contactId" = $1`,
      [UNKNOWN_CONTACT_ID]
    );

    if (contactCheck.rows.length === 0) {
      await dbClient.query(
        `INSERT INTO contacts (
          id, "contactId", "listId", "firstName", "lastName", "fullName", phone, status, 
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          UNKNOWN_CONTACT_ID, 
          UNKNOWN_CONTACT_ID, 
          DEFAULT_LIST_ID,  // ← Use test-list-1 instead of campaign ID
          'Unknown', 
          'Contact', 
          'Unknown Contact (Imported)', 
          '+1000000000', 
          'NEW'
        ]
      );
      console.log('✅ Created placeholder contact:', UNKNOWN_CONTACT_ID);
    } else {
      console.log('✅ Using existing placeholder contact:', UNKNOWN_CONTACT_ID);
    }

    // Step 2: Fetch Twilio calls
    console.log('\n📞 Fetching calls from Twilio...');
    const twilioCallsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json?PageSize=1000`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
        }
      }
    );

    if (!twilioCallsResponse.ok) {
      throw new Error(`Twilio API error: ${twilioCallsResponse.statusText}`);
    }

    const twilioCallsData = await twilioCallsResponse.json();
    console.log(`✅ Found ${twilioCallsData.calls.length} calls from Twilio`);

    // Step 3: Fetch Twilio recordings
    console.log('\n🎙️  Fetching recordings from Twilio...');
    const recordingsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings.json?PageSize=1000`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
        }
      }
    );

    if (!recordingsResponse.ok) {
      throw new Error(`Twilio Recordings API error: ${recordingsResponse.statusText}`);
    }

    const recordingsData = await recordingsResponse.json();
    console.log(`✅ Found ${recordingsData.recordings.length} recordings from Twilio`);

    // Create map of CallSID -> Recording
    const recordingsMap = new Map();
    recordingsData.recordings.forEach(rec => {
      recordingsMap.set(rec.call_sid, rec);
    });
    console.log(`✅ Mapped ${recordingsMap.size} recordings to calls`);

    // Step 4: Import calls
    console.log('\n📥 Importing calls...\n');
    
    let importedCount = 0;
    let skippedCount = 0;
    let withRecordingsCount = 0;

    for (const twilioCall of twilioCallsData.calls) {
      try {
        // Check if call already exists (by callId matching Twilio CallSid)
        const existingCall = await dbClient.query(
          `SELECT id FROM call_records WHERE "callId" = $1`,
          [twilioCall.sid]
        );

        if (existingCall.rows.length > 0) {
          skippedCount++;
          continue;
        }

        // Determine outcome from Twilio status
        let outcome = 'COMPLETED';
        if (twilioCall.status === 'busy') outcome = 'BUSY';
        else if (twilioCall.status === 'no-answer') outcome = 'NO_ANSWER';
        else if (twilioCall.status === 'failed') outcome = 'FAILED';
        else if (twilioCall.status === 'canceled') outcome = 'FAILED';

        // Calculate duration in seconds
        const duration = twilioCall.duration ? parseInt(twilioCall.duration) : 0;

        // Generate CUID for call record ID
        const callRecordId = createId();

        // Insert call record with UNKNOWN_CONTACT_ID
        const insertResult = await dbClient.query(
          `INSERT INTO call_records (
            id, "callId", "campaignId", "contactId", "phoneNumber", 
            "dialedNumber", "callType", "startTime", "endTime", "duration", 
            "outcome", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          RETURNING id`,
          [
            callRecordId, // ← Generated CUID
            twilioCall.sid, // Use Twilio CallSID as callId
            DEFAULT_CAMPAIGN_ID,
            UNKNOWN_CONTACT_ID, // ← Use placeholder contact
            twilioCall.to || '+1000000000',
            twilioCall.from || '+1000000000',
            'outbound',
            new Date(twilioCall.start_time),
            twilioCall.end_time ? new Date(twilioCall.end_time) : null,
            duration,
            outcome
          ]
        );

        const newCallRecordId = insertResult.rows[0].id;
        importedCount++;

        // If this call has a recording, create Recording entry
        const recording = recordingsMap.get(twilioCall.sid);
        if (recording) {
          const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
          const streamingUrl = `/api/recordings/${newCallRecordId}/stream`;
          const recordingId = createId(); // ← Generate ID for recording
          const fileName = `${recording.sid}.mp3`; // ← Use Twilio Recording SID

          // Insert into recordings table
          await dbClient.query(
            `INSERT INTO recordings (
              id, "callRecordId", "fileName", "filePath", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [recordingId, newCallRecordId, fileName, recordingUrl]
          );

          // Update call_records.recording with streaming URL
          await dbClient.query(
            `UPDATE call_records SET recording = $1 WHERE id = $2`,
            [streamingUrl, newCallRecordId]
          );

          withRecordingsCount++;

          if (withRecordingsCount % 10 === 0) {
            console.log(`   ✅ Imported ${withRecordingsCount} recordings...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error importing call ${twilioCall.sid}:`, error.message);
      }
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 IMPORT SUMMARY:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Total Twilio calls:     ${twilioCallsData.calls.length}`);
    console.log(`Imported new calls:     ${importedCount}`);
    console.log(`Skipped (existing):     ${skippedCount}`);
    console.log(`With recordings:        ${withRecordingsCount}`);
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

main();
