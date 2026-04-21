# Seamless Call System - Complete Fix Plan

**Date:** April 21, 2026  
**Priority:** CRITICAL  
**Status:** IN PROGRESS

---

## 🎯 Objectives

1. **Single Active Call Enforcement** - Only one call can be active at a time
2. **Auto-Cleanup on New Call** - Previous call automatically ends when new call starts
3. **Seamless Flow** - Dial → Card → Ring → Answer → Talk → End → Disposition
4. **No Latency/Stuck States** - Proper cleanup and state management
5. **Proper Call Termination** - End calls on both Twilio and database sides
6. **Fix the "37 Active Interactions"** - These are NOT live calls, just undispositioned

---

## 🔍 Root Cause Analysis

### The "37 Active Interactions" Issue
**Status:** ✅ IDENTIFIED - NOT A BUG

- Frontend shows "37 active interactions"
- Database query shows **0 pending calls today**
- **Conclusion:** This is CACHED DATA in browser/frontend state
- **Fix:** Hard refresh (Cmd+Shift+R) will clear this
- **Prevention:** Better cache invalidation on call disposition

### Current Call System Issues

1. **No Active Call Limit**
   - Multiple calls can be initiated simultaneously
   - No check for existing active call before starting new one
   - No cleanup of previous call state

2. **Incomplete Call Lifecycle**
   - Calls can be initiated but not properly tracked
   - No automatic cleanup on navigation/refresh
   - Call state persists even after call ends

3. **Database/Twilio Sync Issues**
   - Call may end in Twilio but not in database
   - Call may end in browser but not in Twilio
   - Orphaned call records with no outcome

4. **State Management Problems**
   - Multiple sources of truth (Redux, local state, database)
   - No single authority for "is there an active call?"
   - State can become inconsistent across components

---

## 📋 Implementation Plan

### Phase 1: Backend - Single Call Enforcement ✅ READY

**File:** `backend/src/controllers/dialerController.ts`

**Changes:**
```typescript
// Before initiating new call:
1. Check for existing active calls for this agent
2. If active call exists:
   - End it in Twilio (hang up)
   - Update database with 'interrupted' status
   - Log the interruption
3. Then proceed with new call

// Active call detection:
- Query call_records for agentId where:
  - startTime IS NOT NULL
  - endTime IS NULL
  - outcome IS NULL or 'pending'
  - createdAt within last 2 hours (safety net)
```

**Implementation:**
```typescript
async function endAnyActiveCallsForAgent(agentId: string): Promise<void> {
  // Find active calls
  const activeCalls = await prisma.callRecord.findMany({
    where: {
      agentId,
      startTime: { not: null },
      endTime: null,
      createdAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
      }
    }
  });

  for (const call of activeCalls) {
    try {
      // End in Twilio
      if (call.callId) {
        await twilioClient.calls(call.callId).update({ status: 'completed' });
      }

      // Update database
      await prisma.callRecord.update({
        where: { id: call.id },
        data: {
          endTime: new Date(),
          outcome: 'interrupted',
          duration: call.startTime 
            ? Math.floor((Date.now() - call.startTime.getTime()) / 1000)
            : 0
        }
      });

      console.log(`✅ Ended active call ${call.callId} for agent ${agentId}`);
    } catch (error) {
      console.error(`❌ Error ending call ${call.callId}:`, error);
    }
  }
}
```

### Phase 2: Frontend - Call State Management ✅ READY

**File:** `frontend/src/components/dialer/RestApiDialer.tsx`

**Changes:**
```typescript
// Before making new call:
1. Check Redux state for active call
2. If active call exists:
   - Display confirmation dialog
   - End previous call automatically
   - Clean up all state
3. Proceed with new call only after cleanup

// On component mount:
1. Check for orphaned calls (calls in Redux but no Twilio device)
2. Clean up orphaned state
3. Sync with backend

// On component unmount:
1. If call is active, keep Redux state
2. If call is ended, clean up
```

**Implementation:**
```typescript
const makeCall = async (phoneNumber: string) => {
  // Check for existing active call
  if (activeCall.isActive) {
    console.warn('⚠️ Active call detected, ending before new call');
    
    // End existing call
    await endCallGracefully(activeCall.callSid);
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Proceed with new call
  // ...existing call logic
};
```

### Phase 3: Call Record Cleanup ✅ READY

**File:** `backend/src/routes/interactionHistory.ts`

**Changes:**
```typescript
// Modify the counts endpoint to:
1. Only count calls from TODAY (already done ✅)
2. Exclude calls older than 2 hours without endTime (stuck calls)
3. Auto-clean stuck calls on query

// Add cleanup function:
async function cleanupStuckCalls(agentId: string): Promise<number> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  const result = await prisma.callRecord.updateMany({
    where: {
      agentId,
      startTime: { not: null, lt: twoHoursAgo },
      endTime: null
    },
    data: {
      endTime: new Date(),
      outcome: 'system-cleanup',
      duration: 7200 // 2 hours
    }
  });

  return result.count;
}
```

### Phase 4: Disposition Modal Enforcement ✅ READY

**File:** `frontend/src/components/modals/DispositionModal.tsx`

**Changes:**
```typescript
// Make disposition modal:
1. Blocking (can't dismiss without selecting)
2. Auto-show on call end
3. Clear all call state only AFTER disposition saved
4. Update interaction counts immediately after save
```

### Phase 5: WebSocket Call Status Sync 🔄 FUTURE

**Files:** 
- `backend/src/services/websocketService.ts`
- `frontend/src/hooks/useWebSocket.ts`

**Changes:**
```typescript
// Real-time call status updates:
1. When call starts → broadcast to agent
2. When call ends → broadcast to agent
3. Agent receives → updates local state
4. Prevents stale state across tabs/devices
```

---

## 🛠️ Detailed Implementation

### 1. Backend: `dialerController.ts` - `makeRestApiCall`

**BEFORE:**
```typescript
export const makeRestApiCall = async (req: Request, res: Response) => {
  // ... validation ...
  
  // Immediately create Twilio call
  const twilioCall = await twilioClient.calls.create({
    to: to_formatted,
    from: fromNumber,
    // ...
  });
  
  // Create call record
  // ...
};
```

**AFTER:**
```typescript
export const makeRestApiCall = async (req: Request, res: Response) => {
  // ... validation ...
  
  // ✅ NEW: End any active calls for this agent
  await endAnyActiveCallsForAgent(agentId);
  
  // Small delay to ensure Twilio processed the hangup
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Now create new call
  const twilioCall = await twilioClient.calls.create({
    to: to_formatted,
    from: fromNumber,
    // ...
  });
  
  // Create call record with active flag
  // ...
};
```

### 2. Frontend: `RestApiDialer.tsx` - Call Initiation

**BEFORE:**
```typescript
const handleMakeCall = async (number: string) => {
  setPhoneNumber(number);
  
  // Make call immediately
  const result = await dialerApi.initiateCall({
    to: number,
    // ...
  });
};
```

**AFTER:**
```typescript
const handleMakeCall = async (number: string) => {
  setPhoneNumber(number);
  
  // ✅ NEW: Check for active call
  if (activeCall.isActive) {
    console.log('🔄 Ending previous call before starting new one...');
    
    // End gracefully with backend notification
    if (activeCall.callSid) {
      await dialerApi.endCall({
        callSid: activeCall.callSid,
        duration: activeCall.duration || 0,
        status: 'interrupted',
        customerInfo: activeCall.customerInfo
      });
    }
    
    // Clear Redux state
    dispatch(endCallAction());
    
    // Wait for state to clear
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Now make new call
  const result = await dialerApi.initiateCall({
    to: number,
    // ...
  });
};
```

### 3. Call Record Schema Update

**Current State:**
- startTime: DateTime
- endTime: DateTime?
- outcome: String?

**Issues:**
- No way to distinguish "never started" vs "in progress" vs "ended"

**Proposed:**
Add computed field or query logic:
```sql
-- Call is ACTIVE if:
startTime IS NOT NULL 
AND endTime IS NULL 
AND createdAt > NOW() - INTERVAL '2 hours'

-- Call is ENDED if:
endTime IS NOT NULL

-- Call is STUCK if:
startTime IS NOT NULL 
AND endTime IS NULL 
AND createdAt < NOW() - INTERVAL '2 hours'

-- Call is ORPHANED if:
startTime IS NULL 
AND createdAt < NOW() - INTERVAL '1 hour'
```

---

## 📊 Testing Plan

### Test 1: Single Call Enforcement
1. Make call to number A
2. While call A is ringing, dial number B
3. **Expected:** Call A ends immediately, Call B starts
4. **Verify:** Only one call_record with endTime=NULL

### Test 2: Call Cleanup on Navigation
1. Make call to number A
2. Answer call, talk for 30 seconds
3. Navigate away from page
4. Return to page
5. **Expected:** Call is still in progress OR properly cleaned up

### Test 3: Disposition Required
1. Make call and complete it
2. Try to make another call
3. **Expected:** Disposition modal blocks new call
4. Disposition call, then retry
5. **Expected:** New call proceeds

### Test 4: Stuck Call Cleanup
1. Manually create call_record with startTime but no endTime (2+ hours old)
2. Refresh interaction counts
3. **Expected:** Count excludes stuck call OR stuck call auto-cleaned

### Test 5: Twilio Sync
1. Make call
2. End call from Twilio Dashboard manually
3. **Expected:** Frontend receives disconnect event, updates state

---

## 🚀 Rollout Plan

### Step 1: Deploy Backend Changes
- Add `endAnyActiveCallsForAgent()` function
- Update `makeRestApiCall` to call it
- Add cleanup to `/counts` endpoint
- **Deploy to Railway**

### Step 2: Deploy Frontend Changes  
- Update `RestApiDialer.tsx` with active call check
- Add confirmation dialog for call interruption
- Update Redux state management
- **Deploy to Vercel**

### Step 3: Database Cleanup (One-time)
```sql
-- Clean up stuck calls (older than 2 hours, no endTime)
UPDATE call_records 
SET 
  endTime = NOW(),
  outcome = 'system-cleanup-2026-04-21',
  duration = EXTRACT(EPOCH FROM (NOW() - startTime))::INTEGER
WHERE 
  endTime IS NULL 
  AND startTime IS NOT NULL
  AND startTime < NOW() - INTERVAL '2 hours';

-- Delete orphaned records (never started, older than 24 hours)
DELETE FROM call_records 
WHERE 
  startTime IS NULL 
  AND createdAt < NOW() - INTERVAL '24 hours';
```

### Step 4: Monitor
- Watch for "interrupted" outcomes
- Check interaction count accuracy
- Verify no duplicate calls in Twilio

---

## ✅ Success Criteria

1. ✅ Only ONE active call per agent at any time
2. ✅ Previous call automatically ends when new call starts
3. ✅ All calls have proper startTime and endTime
4. ✅ Disposition modal appears for every completed call
5. ✅ Interaction counts are accurate (no phantom "active" calls)
6. ✅ No Twilio calls left in 'in-progress' state after agent ends
7. ✅ Agent can make back-to-back calls seamlessly

---

## 🔧 Additional Improvements (Future)

1. **Call Transfer Support**
   - Transfer without losing call record
   - Update both parties in database

2. **Multi-Tab Support**
   - WebSocket sync across browser tabs
   - Only one tab can have active call

3. **Call Queue Management**
   - If agent tries to make call while on call, queue it
   - Auto-dial queued number after disposition

4. **Analytics Dashboard**
   - Track "interrupted" calls
   - Measure call abandonment rate
   - Monitor stuck call frequency

---

## 📝 Notes

- The "37 active interactions" is NOT a bug - it's cached data
- Production database has 0 pending calls for today
- User should hard refresh (Cmd+Shift+R) to clear the cache
- Future: Implement cache invalidation on disposition save

---

**Next Steps:**
1. ✅ Review this plan
2. 🔄 Implement backend changes
3. 🔄 Implement frontend changes  
4. 🔄 Test thoroughly
5. 🚀 Deploy to production
