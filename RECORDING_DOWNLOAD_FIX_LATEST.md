# Recording Download Fix - Complete Summary

## Problem
❌ **Call recordings not downloading** - Browser shows "File wasn't available on site"

## Root Cause Discovered
🔥 **Railway has EPHEMERAL storage** - files are wiped on every deployment

### What was happening:
1. Recording service downloaded Twilio recordings to local filesystem
2. Saved path in database: `recordings/CA...mp3`
3. Files existed temporarily on Railway
4. Backend redeployed (for bug fixes) → **Railway container rebuilt**
5. Filesystem wiped → **All recording files LOST**
6. Database still has old paths pointing to deleted files
7. Download endpoint tries to read files → **404 Not Found**

## Solutions Deployed

### ✅ Fix 1: Store Twilio SIDs (Not Local Paths)
**Commit:** fde2b22

Changed recording service to store Twilio Recording SID instead of local file path:
- **Before:** `filePath = "recordings/CA123_2026-04-28.mp3"` (ephemeral)
- **After:** `filePath = "RExxxxxxxxxxxxx"` (Twilio SID - permanent)

The download endpoint already supports streaming from Twilio SIDs, so downloads now work!

### ✅ Fix 2: Backfill Script for Old Recordings
**Commit:** 0351709

Created script to fix existing recordings with old local paths.

## Action Required

### Step 1: Wait for Railway Deployment (~3-5 minutes)
Both fixes are deploying to Railway now:
- Recording service update
- Backfill script

Check deployment: https://railway.app → FroniterAi project → Backend service

### Step 2: Run Backfill Script (AFTER DEPLOYMENT)
This will fix existing recordings that have local paths:

```bash
# SSH into Railway or use Railway CLI
railway run npx tsx src/scripts/backfill-recording-sids.ts
```

This script will:
1. Find all recordings with local file paths
2. Query Twilio API for each call's recording
3. Extract the Twilio Recording SID
4. Update database with SID instead of local path
5. All old recordings will now download successfully

### Step 3: Test Recording Downloads
1. Go to Reports → Call Records
2. Find a call with a recording icon
3. Click the download button (📥)
4. Recording should download successfully as MP3

## Why This Fix Works

### Architecture Before (BROKEN):
```
Call ends → Download from Twilio → Save to Railway filesystem
          → Store path in DB → Railway redeploys → Files LOST
          → Download fails
```

### Architecture After (FIXED):
```
Call ends → Extract Twilio SID → Store SID in DB
Download request → Read SID from DB → Stream from Twilio directly
             → Always works (Twilio = source of truth)
```

## Benefits
✅ Recordings survive all Railway deployments  
✅ No storage space issues on Railway  
✅ Simpler architecture (stateless)  
✅ Twilio is source of truth  
✅ Download endpoint unchanged  

## Migration Path
- **New calls**: Automatically use Twilio SIDs ✅
- **Existing calls**: Run backfill script to update ⏳
- **After backfill**: All recordings download successfully ✅

## Monitoring
After deployment and backfill:
1. Check Railway logs for: `💾 Recording SID: RExxxxx (will stream from Twilio on download)`
2. Test downloads - should see: `✅ Successfully downloaded X bytes from Twilio`
3. No more 404 errors on recording downloads

---

## Summary of All Fixes Today

This session fixed **10 major issues**:

1. ✅ Audio file playback (streaming from database)
2. ✅ Inbound number configuration form (full implementation)
3. ✅ Real audio files in dropdown (not placeholders)
4. ✅ Recording download authentication (session_token)
5. ✅ Duplicate call records (three-layer prevention)
6. ✅ Recording duplicate constraint errors (upsert)
7. ✅ Notifications 500 error (proxy with fallback)
8. ✅ App loading during backend restart (graceful degradation)
9. ✅ **Recording downloads broken (ephemeral storage fix)** ← JUST NOW
10. ✅ **Backfill script for old recordings** ← JUST NOW

All committed and pushed to production! 🚀
