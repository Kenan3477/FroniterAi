# Manual Fix Required for save-call-data

## Problem
The `replace_string_in_file` tool is matching multiple locations in the file, causing syntax errors.

## File to Edit
`backend/src/routes/callsRoutes.ts`

## Location
Around line **630** (in the save-call-data POST endpoint)

## What to Replace
Find this section (starts around line 627):

```typescript
      let existingRecordByTwilioSid = null;
      if (callSid && callSid.startsWith('CA')) {
        // 🚨 CRITICAL FIX: Search by MULTIPLE criteria to handle race conditions
```

## Replace With

```typescript
      let existingRecordByTwilioSid = null;
      
      // 🚨 PRIORITY 1: Search by conferenceId if provided (most reliable - always set from start)
      if (conferenceId) {
        existingRecordByTwilioSid = await prisma.callRecord.findFirst({
          where: {
            OR: [
              { callId: conferenceId },                  // Direct match on conf-xxx
              { recording: conferenceId },               // Placeholder value before Twilio SID
              { notes: { contains: conferenceId } },     // Fallback: notes contains conf ID
            ]
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (existingRecordByTwilioSid) {
          console.log(`✅ Found record by conferenceId: ${existingRecordByTwilioSid.callId}`);
        } else {
          console.log(`⚠️  No record found with conferenceId: ${conferenceId}`);
        }
      }
      
      // 🚨 PRIORITY 2: Search by Twilio SID if conferenceId search failed
      if (!existingRecordByTwilioSid && callSid && callSid.startsWith('CA')) {
        // Search by MULTIPLE criteria to handle race conditions
```

## Also Need to Add conferenceId to Destructuring

Find this line (around line 202):

```typescript
      callSid,
      recordingUrl
    } = req.body;
```

Change to:

```typescript
      callSid,
      conferenceId,  // 🚨 NEW: Conference ID for finding preliminary record
      recordingUrl
    } = req.body;
```

## After Manual Edit

Run:
```bash
cd /Users/zenan/kennex
git add backend/src/routes/callsRoutes.ts
git commit -m "Backend: Search by conferenceId first to prevent duplicates"
git push
```

## Test
Make a test call and check that only ONE record is created.
