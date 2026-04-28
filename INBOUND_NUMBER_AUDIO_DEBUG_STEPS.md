# Inbound Number & Audio Files Debug Guide

## Issues Reported
1. **Failed to save: Failed to update inbound number** - when assigning a flow
2. **Audio file selection not showing real uploaded files**

## Debug Logging Deployed (Commit 76a2c78)

### What Was Added:

#### Frontend API Route (`frontend/src/app/api/voice/inbound-numbers/[id]/route.ts`):
```
❌ Backend response not ok: [status] [statusText]
❌ Request was: PUT [backendUrl]
❌ Request body: [JSON of what was sent]
```

#### Audio Files Fetch (`frontend/src/components/admin/VoiceChannelManagers.tsx`):
```
🎵 Fetching real audio files from backend...
🎵 Audio files response status: [status]
🎵 Audio files RAW response: [full response object]
🎵 Parsed audio array: [array after parsing]
🎵 Audio array sample: [first 3 items]
✅ Loaded [N] real audio files into state
```

## How to Debug

### Step 1: Check Audio Files Loading
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to Admin → Channels → Voice → Inbound Numbers
4. Look for logs starting with 🎵

**Expected Output:**
```
🎵 Fetching real audio files from backend...
🎵 Audio files response status: 200
🎵 Audio files RAW response: { success: true, audioFiles: [...] }
🎵 Parsed audio array: [{ id: "...", name: "...", duration: ... }, ...]
🎵 Audio array sample: [first 3 files]
✅ Loaded 5 real audio files into state
```

**If you see 0 files:**
- Check if audio files have been uploaded to the system
- Check if backend route `/api/voice/audio-files` returns data
- Look for errors in Railway logs

### Step 2: Check Flow Assignment Save Error
1. Keep console open
2. Click three-dot menu (•••) on an inbound number
3. Select a flow from "Assign Flow" dropdown
4. Click "Save Changes"
5. Look for logs with ❌ emoji

**Expected Logs:**
```
🔧 Saving inbound number with ID: [id]
🔧 Update data being sent to backend: { assignedFlowId: "...", selectedFlowId: "..." }
```

Then one of:
- ✅ Success: `✅ Inbound number updated successfully`
- ❌ Error: `❌ Backend response not ok: [status]` with full request details

## Possible Causes & Solutions

### Issue 1: "Failed to update inbound number"

**Cause A: Flow ID doesn't exist**
- Backend validates flow with `prisma.flow.findUnique()`
- If flow not found → 400 error: "Assigned flow not found"
- **Solution:** Check that flows exist in database

**Cause B: Invalid inbound number ID**
- Backend checks `prisma.inboundNumber.findUnique({ where: { id } })`
- If not found → 404 error: "Inbound number not found"
- **Solution:** Verify the ID being sent matches database

**Cause C: Authentication expired**
- Token validation fails
- **Solution:** Log out and log back in

### Issue 2: Audio files not showing in dropdown

**Cause A: No audio files uploaded**
- Check Admin → Channels → Voice → Audio Files
- Upload audio files if none exist
- **Solution:** Upload MP3/WAV files first

**Cause B: Backend not returning correct structure**
- Expected: `{ success: true, audioFiles: [...] }`
- Check Railway logs for `/api/voice/audio-files` route
- **Solution:** Verify backend audioFileRoutes.ts is working

**Cause C: Frontend parsing issue**
- Check if `data.audioFiles` exists in response
- **Solution:** Logs will show raw response vs parsed array

## Next Steps After Checking Logs

### If Audio Files Problem:
1. Share console output starting with 🎵
2. Check Railway logs for `📁 Fetching all audio files...`
3. Verify audio files exist in database

### If Flow Assignment Problem:
1. Share console output with ❌ errors
2. Note the exact error message from backend
3. Share the flowId being sent

## Manual Verification

### Check Database Directly:
```sql
-- Check flows exist
SELECT id, name, status FROM "Flow" LIMIT 5;

-- Check inbound numbers
SELECT id, "phoneNumber", "displayName", "assignedFlowId" 
FROM "InboundNumber" LIMIT 5;

-- Check audio files
SELECT id, "displayName", type, duration 
FROM "AudioFile" LIMIT 5;
```

### Test with cURL:
```bash
# Get audio files
curl -X GET https://froniterai-production.up.railway.app/api/voice/audio-files \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update inbound number
curl -X PUT https://froniterai-production.up.railway.app/api/voice/inbound-numbers/[ID] \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test","assignedFlowId":"FLOW_ID"}'
```

---

## Summary

**Deployment:** Vercel is deploying debug logs now (~2-3 minutes)
**Action Required:** After deployment, reload admin page and check console
**Share:** Console logs with 🎵 and ❌ for diagnosis

The logs will tell us exactly:
1. Whether audio files are being fetched
2. What data is being sent for inbound number update
3. What specific error the backend is returning
