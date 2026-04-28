# Comprehensive Fix Plan - All Outstanding Issues

## ISSUE SUMMARY

You're experiencing 5 critical issues:
1. ❌ Inbound number save 404 (Vercel cache)
2. ❌ Duplicate call records (2 per call)
3. ❌ Audio playback fails
4. ❌ "system-cleanup" dispositions appearing
5. ❌ Missing call recordings

## ROOT CAUSES IDENTIFIED

### Issue 1: Vercel Cache
- Fix deployed (commit fb3fb7e)
- Browser cached old 404 response
- **Action:** Hard refresh browser

### Issue 2: Duplicate Call Records
**CRITICAL DISCOVERY:** Your duplicate prevention code is BROKEN!

Current code checks:
```typescript
const existingCall = await prisma.callRecord.findUnique({
  where: { callId: data.callId }
});
```

**Problem:** Twilio creates DIFFERENT callIds for each leg:
- Agent's outbound leg: `CAabc123` 
- Customer's inbound leg: `CAdef456`
- Parent call: `CAparent789`

So the check NEVER finds duplicates because callIds are different!

**Real Fix:** Check by phone number + time window + campaign:
```typescript
const existingCall = await prisma.callRecord.findFirst({
  where: {
    phoneNumber: data.phoneNumber,
    campaignId: data.campaignId,
    startTime: {
      gte: new Date(Date.now() - 10000) // Within 10 seconds
    }
  }
});
```

### Issue 3: Audio Playback
**Need More Info:**
- What URL is the audio element trying to load?
- Check browser console for the exact <audio src="???">

### Issue 4: "system-cleanup" Dispositions
**Found:** Two places creating this:
1. `/backend/src/services/stuckCallPrevention.ts:135`
2. `/backend/src/routes/interactionHistory.ts:436`

**Fix:** Change to proper dispositions like 'no-answer' or 'abandoned'

### Issue 5: Missing Recordings
**Causes:**
1. Twilio not recording calls
2. Recording sync not running
3. Recording SID not being stored properly

---

## FIXES TO DEPLOY NOW

### Fix 1: Browser Cache (USER ACTION)
```bash
# Hard refresh browser
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

### Fix 2: Remove "system-cleanup" Disposition
Change stuck call cleanup to use proper dispositions.

### Fix 3: Fix Duplicate Detection
Change from callId check to phone number + time + campaign check.

### Fix 4: Ensure All Calls Have Recordings
Add logging to see why recordings are missing.

---

## DEPLOYMENT SEQUENCE

1. Fix "system-cleanup" → proper dispositions
2. Fix duplicate detection → phone number + time check
3. Add recording diagnostics
4. Commit and push
5. Test after deployment
6. Clean up existing duplicate records

---

## TESTING CHECKLIST

After fixes deploy:
- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Try to assign flow to inbound number
- [ ] Make a test outbound call
- [ ] Verify only ONE call record created
- [ ] Verify call has recording
- [ ] Check no "system-cleanup" dispositions
- [ ] Test audio playback

---

## NEXT STEPS

Let me implement these fixes now. Then you need to:
1. Hard refresh your browser
2. Test each issue
3. Share console logs if any still failing
