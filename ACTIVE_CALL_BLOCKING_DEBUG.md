# Active Call Blocking - Debug Investigation

**Date:** 2026-04-28  
**Issue:** User gets "already have an active call" error after dispositioning previous call  
**Status:** 🔍 INVESTIGATING - Debug logging deployed

---

## Problem Statement

User reported:
> "I'm still getting the error message 'You already have an active call' but there are no active calls. After I disposition a call, the system should automatically mark it as ended so I can make the next call."

**Expected Behavior:**
1. Agent makes call → Call starts with `outcome = 'in-progress'`
2. Agent ends call and submits disposition → Call updated to `outcome = 'completed'`
3. Agent makes next call → System finds NO calls with `outcome = 'in-progress'`
4. New call proceeds ✅

**Actual Behavior:**
1. Agent makes call → Call starts with `outcome = 'in-progress'`
2. Agent ends call and submits disposition → ??? (What happens here?)
3. Agent makes next call → System finds call with `outcome = 'in-progress'` ❌
4. Call BLOCKED with error: "Agent already has an active call"

---

## Technical Architecture

### Call State Machine

```
CREATE CALL
    ↓
outcome: 'in-progress'
    ↓
CALL IN PROGRESS
    ↓
AGENT HANGS UP
    ↓
DISPOSITION SUBMITTED
    ↓
outcome: 'completed' (or other mapped value)
    ↓
CALL COMPLETE
    ↓
NEW CALL ALLOWED ✅
```

### Database Schema

**CallRecord Table:**
```typescript
{
  callId: string,        // conf-xxx or CA-xxx
  outcome: string,       // 'in-progress' | 'completed' | 'no_answer' | etc.
  dispositionId: number, // FK to Disposition table
  endTime: Date,         // When call ended
  notes: string,         // Contains [USER:509|username]
  // ... other fields
}
```

### Active Call Detection Logic

**File:** `backend/src/controllers/dialerController.ts`  
**Function:** `checkForActiveCallByUserId(userId)`

```typescript
const activeCall = await prisma.callRecord.findFirst({
  where: {
    notes: { contains: `[USER:${userId}|` },
    outcome: 'in-progress',  // ← KEY FILTER
    createdAt: { gte: twoHoursAgo }
  }
});

if (activeCall && !forceCall) {
  return 409; // Conflict - agent has active call
}
```

**The Logic:**
- If ANY call exists with `outcome = 'in-progress'` for this user → BLOCK new calls
- If NO calls with `outcome = 'in-progress'` → ALLOW new calls

### Disposition Save Logic

**File:** `backend/src/routes/callsRoutes.ts`  
**Endpoint:** `POST /api/calls/save-call-data`

```typescript
const mappedOutcome = mapDispositionToOutcome(disposition);
// Returns: 'completed', 'no_answer', 'busy', etc.

await prisma.callRecord.upsert({
  where: { callId: finalCallId },
  update: {
    outcome: mappedOutcome,  // ← SHOULD CHANGE FROM 'in-progress'
    dispositionId: validDispositionId,
    endTime: new Date()
  }
});
```

**The Logic:**
- When disposition submitted → `outcome` should change from `'in-progress'` to `mappedOutcome`
- This should make the call disappear from active call queries
- Next dial attempt should succeed

---

## Hypothesis: What Could Be Wrong?

### Theory 1: Disposition Save Doesn't Update Outcome ❌
**Possibility:** The `upsert` is failing silently or not executing
**Evidence Needed:** 
- Does `mappedOutcome` have correct value?
- Does `upsert` execute successfully?
- What is the outcome value AFTER upsert?

### Theory 2: Wrong Call Record Being Updated ❌
**Possibility:** Frontend sends wrong `callSid` or `conferenceId`
**Evidence Needed:**
- Does `finalCallId` match the active call's `callId`?
- Are we updating a different record by mistake?
- Is there a duplicate call record?

### Theory 3: Timing/Race Condition ❌
**Possibility:** New call starts BEFORE disposition save completes
**Evidence Needed:**
- Timestamps of disposition save vs new call attempt
- Is there enough time between operations?

### Theory 4: Frontend Not Clearing State ❌
**Possibility:** Redux `activeCall` state not cleared
**Evidence Needed:**
- Check frontend console for `dispatch(endCall())` calls
- Verify Redux state after disposition

---

## Debug Logging Deployed

### Phase 1: Disposition Save Logging

**Location:** `backend/src/routes/callsRoutes.ts` (Line ~695)

**Logs Added:**
```typescript
console.log('🔥 CRITICAL: About to upsert call record');
console.log('   finalCallId:', finalCallId);
console.log('   mappedOutcome:', mappedOutcome);
console.log('   THIS SHOULD CHANGE outcome FROM "in-progress" TO:', mappedOutcome);

// ... upsert happens ...

console.log('✅ Call record created/updated:', callRecord.callId);
console.log('🔥 CRITICAL VERIFICATION: Call outcome AFTER upsert:', callRecord.outcome);
console.log('   Expected outcome:', mappedOutcome);
console.log('   Actual outcome:', callRecord.outcome);

if (callRecord.outcome === 'in-progress') {
  console.error('❌ BUG DETECTED: Call still shows "in-progress" after disposition save!');
} else {
  console.log('✅ SUCCESS: Call marked as complete - agent can make new calls');
}
```

**What This Shows:**
- Exact `mappedOutcome` value being set
- Whether `upsert` executes
- Outcome value BEFORE and AFTER update
- Whether the bug is in the disposition save

### Phase 2: Active Call Check Logging

**Location:** `backend/src/controllers/dialerController.ts` (Line ~54)

**Logs Added:**
```typescript
console.log('🔍 ACTIVE CALL CHECK: Searching for active calls for userId:', userId);
console.log('   Looking for: outcome="in-progress" AND notes contains [USER:${userId}|');

// ... query executes ...

console.log('🔍 ACTIVE CALL CHECK RESULT:', activeCall ? 'FOUND' : 'NONE');
if (activeCall) {
  console.log('   ⚠️  Active call found:');
  console.log('   - callId:', activeCall.callId);
  console.log('   - phoneNumber:', activeCall.phoneNumber);
  console.log('   - dispositionId:', activeCall.dispositionId);
  console.log('   - endTime:', activeCall.endTime);
  console.log('   This will BLOCK the new call attempt!');
} else {
  console.log('   ✅ No active calls - new call will proceed');
}
```

**What This Shows:**
- Exact search criteria
- Whether any calls are found
- Full details of blocking call
- Why call is being blocked

---

## Testing Instructions

### Step 1: Make a Call
1. Login to Omnivox-AI
2. Go to Work → Manual Dial
3. Enter UK number: `07487723751`
4. Click "Call Customer"
5. **Watch Railway logs for:**
   ```
   📞 Making REST API call
   outcome: 'in-progress'  ← Call created
   ```

### Step 2: End Call and Disposition
1. Talk for a few seconds
2. Hang up the call
3. Disposition modal appears
4. Select any disposition (e.g., "Interested")
5. Click "Save"
6. **Watch Railway logs for:**
   ```
   🔥 CRITICAL: About to upsert call record
   mappedOutcome: 'completed'
   🔥 CRITICAL VERIFICATION: Call outcome AFTER upsert: 'completed'
   ✅ SUCCESS: Call marked as complete
   ```

### Step 3: Make Next Call
1. Enter same or different number
2. Click "Call Customer"
3. **Watch Railway logs for:**
   ```
   🔍 ACTIVE CALL CHECK: Searching for active calls
   🔍 ACTIVE CALL CHECK RESULT: NONE
   ✅ No active calls - new call will proceed
   ```

### What If It Fails?

**If logs show:**
```
🔥 CRITICAL VERIFICATION: Call outcome AFTER upsert: 'in-progress'
❌ BUG DETECTED: Call still shows "in-progress" after disposition save!
```
**Diagnosis:** Disposition save is NOT updating outcome
**Fix:** Check upsert logic, ensure `mappedOutcome` is correct

**If logs show:**
```
🔍 ACTIVE CALL CHECK RESULT: FOUND
⚠️  Active call found:
- callId: conf-xxx
- outcome: in-progress  ← Still showing in-progress!
```
**Diagnosis:** Call found with `outcome='in-progress'` when it should be `'completed'`
**Fix:** Investigate why disposition save didn't change outcome

**If logs show:**
```
🔥 CRITICAL VERIFICATION: Call outcome AFTER upsert: 'completed'
✅ SUCCESS: Call marked as complete
---
🔍 ACTIVE CALL CHECK RESULT: FOUND
- outcome: 'in-progress'  ← Different call!
```
**Diagnosis:** Multiple call records exist, updating wrong one
**Fix:** Check for duplicate call records

---

## Auto-Cleanup Failsafe

**Already Implemented:** `checkForActiveCallByUserId()` has auto-cleanup logic

```typescript
if (activeCall) {
  const hasDisposition = activeCall.dispositionId !== null;
  const hasEndTime = activeCall.endTime !== null;
  
  if (hasDisposition || hasEndTime) {
    console.log('🧹 AUTO-CLEANUP: Closing dispositioned/ended call');
    
    await prisma.callRecord.update({
      where: { callId: activeCall.callId },
      data: {
        outcome: 'completed',
        endTime: activeCall.endTime || new Date()
      }
    });
    
    return null; // Allow new call to proceed
  }
}
```

**Behavior:**
- If active call has `dispositionId` OR `endTime` → Auto-close it
- This fixes stuck calls that have disposition but wrong outcome
- New call proceeds immediately after auto-cleanup

---

## Next Steps

1. **Deploy Complete:** Debug logging is live on Railway
2. **User Test:** Make call → Disposition → Make next call
3. **Check Logs:** Railway logs will show exact state transitions
4. **Identify Root Cause:** Logs will reveal which theory is correct
5. **Implement Fix:** Based on logging evidence
6. **Remove Debug Logs:** After issue resolved

---

## Expected Timeline

- **Now:** Debug logging deployed
- **User tests:** Next call attempt
- **Logs analyzed:** Within 5 minutes of test
- **Fix identified:** Based on log evidence
- **Fix deployed:** Within 30 minutes
- **Issue resolved:** Same day

---

## Summary

**Problem:** Calls blocked by "already have active call" error after disposition

**Root Cause (Suspected):** Call `outcome` not updating from `'in-progress'` to `'completed'` when disposition saved

**Investigation Method:** Comprehensive logging at critical state transition points

**Resolution:** Once logs identify exact failure point, implement targeted fix

**User Impact:** Temporary - debug logs will identify and fix issue quickly

**Compliance:** Rules 2, 5, 9 (Incremental changes, Observability, Clear distinction between states)
