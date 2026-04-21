# Dashboard & Interaction Stats Fix - April 21, 2026

## 🔍 Issues Identified

### 1. Outcomed Interactions Flickering
**Symptom:** The outcomed interactions count appears then disappears in the Work page sidebar

**Root Cause:** Inconsistent data queries between different endpoints:
- `/api/interaction-history/counts` uses: `outcome NOT NULL AND outcome != '' AND outcome != 'pending'`
- Dashboard stats uses: AI-powered classification with complex logic
- Auto-cleanup runs and changes outcomes to 'system-cleanup' or 'interrupted'

**Result:** Count changes as cleanup runs, causing flickering

### 2. Inaccurate Dashboard Call Stats
**Symptom:** Dashboard shows incorrect "Successful Calls" count

**Root Cause:** Multiple inconsistencies:
- `callsAttempted` = today's total calls (correct)
- `successfulCalls` = calls with positive outcomes (correct logic, but not matching)
- `callsConnected` = same as `callsAttempted` (WRONG - assumes 100% connection)
- `callsAnswered` = same as `callsAttempted` (WRONG - assumes 100% answer rate)

**Result:** Stats don't reflect reality

---

## 🎯 Fix Strategy

### Core Principle: SINGLE SOURCE OF TRUTH
All endpoints must use the SAME logic to count calls by status.

### Standardized Call Classification

```typescript
// ENDED WITH OUTCOME (Dispositioned)
outcome IS NOT NULL 
AND outcome != '' 
AND outcome != 'pending'
AND endTime IS NOT NULL

// ACTIVE/PENDING (Needs Disposition)
(outcome IS NULL OR outcome = '' OR outcome = 'pending')
AND endTime IS NULL  
AND createdAt > NOW() - INTERVAL '2 hours'

// STUCK (System Error - Auto-Cleaned)
outcome = 'system-cleanup'
OR outcome = 'interrupted'

// SUCCESSFUL (Positive Outcome)
outcome IN ('sale', 'interested', 'callback', 'appointment', 'contact_made', 'SALE', 'INTERESTED', 'CALLBACK', 'APPOINTMENT')
AND endTime IS NOT NULL
AND duration > 0
```

---

## 🔧 Implementation

### Fix 1: Standardize Interaction Counts

**File:** `backend/src/routes/interactionHistory.ts`

**Change:**
```typescript
// BEFORE:
const pendingCount = await prisma.callRecord.count({
  where: {
    agentId: agentId,
    createdAt: { gte: today, lt: tomorrow },
    OR: [
      { outcome: null },
      { outcome: '' },
      { outcome: 'pending' }
    ]
  }
});

// AFTER (with endTime check):
const pendingCount = await prisma.callRecord.count({
  where: {
    agentId: agentId,
    createdAt: { gte: today, lt: tomorrow },
    endTime: null, // ✅ CRITICAL: Only count calls that haven't ended
    OR: [
      { outcome: null },
      { outcome: '' },
      { outcome: 'pending' }
    ]
  }
});
```

**Why:** This ensures we only count calls that are ACTUALLY pending (not ended but not dispositioned)

### Fix 2: Accurate Dashboard Stats

**File:** `frontend/src/app/api/dashboard/stats/route.ts`

**Changes:**
```typescript
// Calculate ACTUAL stats, not assumptions

// 1. Total calls today
const todaysCalls = await prisma.callRecord.count({
  where: {
    createdAt: { gte: todayTest, lt: tomorrowTest }
  }
});

// 2. Answered calls (calls that actually connected)
const answeredCalls = await prisma.callRecord.count({
  where: {
    createdAt: { gte: todayTest, lt: tomorrowTest },
    endTime: { not: null }, // Call was answered and ended
    duration: { gt: 0 } // Had some duration
  }
});

// 3. Successful calls (positive outcomes only)
const successfulCalls = await prisma.callRecord.count({
  where: {
    createdAt: { gte: todayTest, lt: tomorrowTest },
    outcome: {
      in: ['sale', 'interested', 'callback', 'appointment', 'contact_made',
           'SALE', 'INTERESTED', 'CALLBACK', 'APPOINTMENT', 'CONTACT_MADE']
    },
    endTime: { not: null }
  }
});

// 4. Connection rate
const connectionRate = todaysCalls > 0 
  ? (answeredCalls / todaysCalls) * 100 
  : 0;

// 5. Answer rate  
const answerRate = connectionRate; // Same as connection rate

// 6. Conversion rate
const conversionRate = answeredCalls > 0
  ? (successfulCalls / answeredCalls) * 100
  : 0;
```

### Fix 3: Prevent Flickering with Stable Queries

**Approach:**
1. Only run cleanup once per agent per hour (not on every count query)
2. Use consistent date filtering
3. Cache counts for 30 seconds

**Implementation:**
```typescript
// Add cleanup cooldown
const CLEANUP_COOLDOWN = 60 * 60 * 1000; // 1 hour
const lastCleanup = new Map<string, number>();

router.get('/counts', async (req, res) => {
  const agentId = req.query.agentId;
  
  // Only run cleanup if it's been > 1 hour since last cleanup for this agent
  const now = Date.now();
  const lastRun = lastCleanup.get(agentId) || 0;
  
  if (now - lastRun > CLEANUP_COOLDOWN) {
    await cleanupStuckCalls(agentId);
    lastCleanup.set(agentId, now);
  }
  
  // Return counts
  // ...
});
```

---

## 📊 Expected Results

### Before Fix:
```
Dashboard:
- Today's Calls: 45
- Successful Calls: 45 (WRONG - assumes 100%)
- Connection Rate: 100% (WRONG)

Work Page:
- Outcomed: 12 → 0 → 12 → 0 (flickering)
- Active: 33 → 45 → 33 (inconsistent)
```

### After Fix:
```
Dashboard:
- Today's Calls: 45 (total attempts)
- Successful Calls: 12 (actual positive outcomes)
- Connection Rate: 84% (38/45 answered)

Work Page:
- Outcomed: 12 (stable)
- Active: 5 (actually pending disposition)
```

---

## ✅ Success Criteria

1. Dashboard stats match reality:
   - [ ] Total calls = actual calls attempted
   - [ ] Successful calls = calls with positive outcomes
   - [ ] Connection rate = (answered / attempted) * 100
   - [ ] Answer rate = connection rate
   - [ ] Conversion rate = (successful / answered) * 100

2. Interaction counts stable:
   - [ ] Outcomed count doesn't flicker
   - [ ] Active/Allocated count only shows truly pending calls
   - [ ] Counts consistent across refreshes

3. Auto-cleanup works correctly:
   - [ ] Runs max once per hour per agent
   - [ ] Doesn't interfere with count queries
   - [ ] Logs cleanup activity

---

## 🚀 Deployment Plan

1. **Backend Fix:** Update interaction counts endpoint
2. **Dashboard Fix:** Update stats calculation logic
3. **Test:** Verify counts match between endpoints
4. **Deploy:** Push to production
5. **Monitor:** Watch for flickering behavior

---

**Status:** Ready for implementation
**Priority:** HIGH (User Experience Issue)
**Est. Time:** 30 minutes
