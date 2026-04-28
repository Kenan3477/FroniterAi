# CRITICAL ISSUES - Immediate Action Required

## Issue 1: Vercel Cache - 404 on Inbound Number Save
**Error:** `404 on /api/voice/inbound-numbers/uk-local-london`
**Status:** Code is fixed (commit fb3fb7e) but Vercel is caching old version

### FIX: Hard Refresh Vercel
```bash
# Option 1: Force redeploy (best)
vercel --prod --force

# Option 2: Clear browser cache completely
Cmd+Shift+Delete (Chrome) → Clear cache

# Option 3: Check Vercel dashboard
# https://vercel.com/kenan3477/project → Deployments
# Ensure latest commit (fb3fb7e) is deployed
```

## Issue 2: Duplicate Call Records STILL APPEARING
**Problem:** Two records per call despite "prevention" code
**Root Cause:** `startCall()` checks `callId` BUT Twilio uses DIFFERENT callIds for each leg!

### Example:
- Parent Call SID: `CA123parent`
- Outbound leg: `CA456outbound` ← Creates record 1
- Inbound leg (to customer): `CA789inbound` ← Creates record 2

**The check fails because callIds are different!**

### REAL FIX NEEDED:
Must check by **phoneNumber + timestamp + campaignId** NOT callId alone.

## Issue 3: Audio Playback - "No supported source"
**Error:** `NotSupportedError: Failed to load because no supported source was found`
**Root Cause:** Audio element src pointing to wrong URL or invalid format

### Check:
1. What URL is in the audio src attribute?
2. Is it pointing to `/api/audio-files/:id/stream`?
3. Does the audio file exist in database?

## Issue 4: "system-cleanup" Disposition
**This should NOT exist!**
**Action:** Find where this is being set and remove it immediately.

## Issue 5: Missing Recordings on Outbound Calls
**You're right:** EVERY outbound call should have a recording
**Current state:** Some showing "No recording"

### Causes:
1. Recording sync not happening
2. Twilio recording not created
3. Recording SID not being stored

---

## IMMEDIATE ACTIONS

1. **Clear Vercel cache** - Redeploy or hard refresh
2. **Check Railway logs** for duplicate call creation
3. **Share browser console** for audio playback error details
4. **Delete all "system-cleanup" records** from database

