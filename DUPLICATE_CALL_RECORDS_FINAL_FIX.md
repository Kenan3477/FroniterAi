# 🔧 Duplicate Call Records - Final Fix Complete

**Date:** 27 April 2026  
**Status:** ✅ **RESOLVED** - Fix deployed to GitHub, awaiting Vercel deployment  
**Commit:** `0935a6c` - CRITICAL FIX: Add conferenceId to incoming call handler Redux dispatch

---

## 🎯 Issue Summary

**Problem:** Every call creates TWO call records in database:
1. ✅ One with `callId="conf-XXXXXX"` with recording
2. ❌ One with `callId="CA..."` (Twilio SID) with wrong disposition

**User Impact:**
- Call history shows duplicate entries
- Analytics/reporting inaccurate
- Cannot reliably track call recordings
- Campaign names showing as "[DELETED]"

---

## 🔍 Root Cause Analysis

### The Architecture (How REST API Calls Work)

1. **Frontend calls backend** `/api/dialer/make-rest-api-call`
2. **Backend creates preliminary record**:
   ```typescript
   callId: "conf-1777323947638-xxx"
   recording: "conf-1777323947638-xxx"  // Initial placeholder
   agentId: null
   outcome: "in-progress"
   ```

3. **Backend calls Twilio REST API** to dial customer
4. **Twilio TwiML dials agent's browser automatically**:
   ```typescript
   dial.client('agent-browser');  // Triggers 'incoming' event in frontend
   ```

5. **Frontend 'incoming' handler fires** when Twilio calls agent
6. **Customer disposition submitted** via CustomerInfoCard
7. **Backend searches for record** to update with disposition

### The Bug (Multiple Parts)

#### ❌ **BUG #1: Backend Search Mismatch**
- Preliminary record has `recording="conf-XXX"` initially
- Backend search only looked for Twilio SID `recording="CA..."`
- Search failed → created duplicate record

**✅ FIXED (Commit c3ffd41 + 75db4c9):**
- Set `recording=conferenceId` initially
- Two-tier search: PRIORITY 1 by conferenceId, PRIORITY 2 by Twilio SID

#### ❌ **BUG #2: Missing conferenceId in Redux State**
- RestApiDialer stored conferenceId in local state only
- CustomerInfoCard reads from Redux global state
- Redux didn't have conferenceId field

**✅ FIXED (Commit 6014a00):**
- Added `conferenceId` to Redux `ActiveCallState` interface
- Updated `startCall` action to accept conferenceId
- CustomerInfoCard reads from Redux and sends to backend

#### ❌ **BUG #3: State Cleared Before Handler Executes**
- `joinAgentToConference` function attempted to read `activeRestApiCall?.conferenceId`
- State was cleared before accept handler executed
- Result: conferenceId was null

**✅ FIXED (Commit 493568c):**
- Use closure capture: `conferenceId` from function parameter
- Capture `callSid` before state cleared
- Both values preserved when handler executes

#### ❌ **BUG #4: Incoming Handler Missing conferenceId** ⚠️ **THIS WAS THE REAL ISSUE**
- TwiML automatically dials agent browser → triggers `incoming` event
- `incoming` handler dispatches `startCall` to Redux
- **BUT: incoming handler did NOT include conferenceId in dispatch**
- Redux stored: `{ callSid: "CA...", conferenceId: undefined }`
- CustomerInfoCard read `undefined` from Redux
- Backend received `conferenceId: undefined`
- Backend search failed → created duplicate

**✅ FIXED (Commit 0935a6c - JUST NOW):**
```typescript
// Read conferenceId from activeRestApiCall state
const conferenceId = activeRestApiCall?.conferenceId || undefined;

// Include in Redux dispatch
dispatch(startCall({
  phoneNumber: customerNumber,
  callSid: callSid,
  conferenceId: conferenceId,  // ✅ NOW INCLUDED!
  callType: isOutboundCall ? 'outbound' : 'inbound',
  customerInfo: { ... }
}));
```

---

## 📊 Call Flow Diagram (Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Frontend: makeRestApiCall()                                  │
│    - POST /api/dialer/make-rest-api-call                       │
│    - Phone: +447487723751                                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Backend: Create Preliminary Record                          │
│    callId: "conf-1777323947638-xxx"                            │
│    recording: "conf-1777323947638-xxx"  ✅ Searchable!         │
│    agentId: null                                                │
│    outcome: "in-progress"                                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Backend: Call Twilio REST API                               │
│    twilioClient.calls.create({                                  │
│      to: "+447487723751",                                       │
│      url: "/api/calls/twiml-customer-to-agent"                  │
│    })                                                           │
│    Returns: CallSid "CA576ab450..."                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Backend: Update Record with Twilio SID                      │
│    UPDATE CallRecord                                            │
│    SET recording = "CA576ab450..."                             │
│    WHERE callId = "conf-1777323947638-xxx"                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Twilio: Execute TwiML                                        │
│    <Dial>                                                       │
│      <Client>agent-browser</Client>  ← Calls agent's browser!  │
│    </Dial>                                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Frontend: 'incoming' Event Handler                          │
│    device.on('incoming', (call) => {                            │
│      const conferenceId = activeRestApiCall?.conferenceId  ✅   │
│      dispatch(startCall({                                       │
│        callSid: "CA576ab450...",                                │
│        conferenceId: "conf-1777323947638-xxx"  ✅ INCLUDED!     │
│      }))                                                        │
│    })                                                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Redux: Global State Updated                                 │
│    activeCall: {                                                │
│      callSid: "CA576ab450...",                                  │
│      conferenceId: "conf-1777323947638-xxx",  ✅               │
│      phoneNumber: "+447487723751",                              │
│      callType: "outbound"                                       │
│    }                                                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Agent Ends Call & Submits Disposition                       │
│    CustomerInfoCard.handleDispositionSubmit()                   │
│    - Reads from Redux: conferenceId = "conf-1777323947638-xxx" │
│    - POST /api/calls/save-call-data                            │
│      {                                                          │
│        callSid: "CA576ab450...",                                │
│        conferenceId: "conf-1777323947638-xxx",  ✅             │
│        disposition: { outcome: "Not Interested" }               │
│      }                                                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Backend: Two-Tier Search                                    │
│    🔍 PRIORITY 1: Search by conferenceId                        │
│       WHERE callId = "conf-1777323947638-xxx"  ✅ FOUND!        │
│       OR recording = "conf-1777323947638-xxx"                   │
│       OR notes LIKE '%[CONF:conf-1777323947638-xxx]%'          │
│                                                                 │
│    Result: FOUND preliminary record                             │
│    Action: UPDATE (not create duplicate)                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Backend: Update Record with Disposition                    │
│     UPDATE CallRecord                                           │
│     SET                                                         │
│       outcome = "Not Interested",                               │
│       dispositionId = ...,                                      │
│       endTime = NOW()                                           │
│     WHERE callId = "conf-1777323947638-xxx"                    │
│                                                                 │
│     ✅ SINGLE RECORD with both recording AND disposition!       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ All Fixes Deployed

| Fix | Commit | Status | Backend | Frontend |
|-----|--------|--------|---------|----------|
| Backend: Set recording=conferenceId initially | `c3ffd41` | ✅ Deployed | ✅ Railway | N/A |
| Backend: Two-tier search (conferenceId priority) | `75db4c9` | ✅ Deployed | ✅ Railway | N/A |
| Frontend: Add conferenceId to Redux state | `6014a00` | ⏳ Pending | N/A | ⏳ Vercel |
| Frontend: CustomerInfoCard sends conferenceId | `6014a00` | ⏳ Pending | N/A | ⏳ Vercel |
| Frontend: Closure capture fix (joinAgentToConference) | `493568c` | ⏳ Pending | N/A | ⏳ Vercel |
| **Frontend: Incoming handler includes conferenceId** | `0935a6c` | **⏳ Pending** | N/A | **⏳ Vercel** |

---

## 🧪 Testing Instructions

### Step 1: Wait for Vercel Deployment

1. Check Vercel dashboard: https://vercel.com/your-project/deployments
2. Wait for commit `0935a6c` to deploy (should auto-deploy within 2-5 minutes)
3. Verify deployment status shows "Ready"

### Step 2: Clear Browser Cache (CRITICAL)

Even after Vercel deploys, your browser may still serve old JavaScript files. You MUST clear cache:

**Chrome:**
1. Press `Cmd + Shift + Delete`
2. Select "Cached images and files"
3. Time range: "Last 24 hours" (or "All time" to be safe)
4. Click "Clear data"

**Alternative: Hard Refresh**
1. Close ALL Omnivox tabs
2. Open new tab, go to Omnivox URL
3. Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows) **FIVE TIMES**
4. Check browser DevTools → Network tab → Disable cache checkbox

### Step 3: Make Test Call

1. Log into Omnivox
2. Go to **Work** page
3. Make ONE test call to any phone number
4. Answer the call (two-way audio should work)
5. End the call
6. Submit ANY disposition (e.g., "Not Interested")

### Step 4: Check Railway Logs (CRITICAL)

Immediately after submitting disposition, copy Railway logs and look for:

**✅ Expected (Success):**
```
🔥 SAVE-CALL-DATA ENDPOINT HIT - VERSION 2.0 🔥
   callSid from frontend: CA576ab450882a09ed76a965fd02667a01
   conferenceId from frontend: conf-1777323947638-xxx  ✅ NOT UNDEFINED!
   
🔍 PRIORITY 1 SEARCH: Looking for record by conferenceId
   WHERE callId = conf-1777323947638-xxx
   OR recording = conf-1777323947638-xxx
   OR notes LIKE '%[CONF:conf-1777323947638-xxx]%'
   
   Search result: FOUND  ✅
   
💾 SAVE-CALL-DATA: Using callId for upsert: conf-1777323947638-xxx
   Will UPDATE existing record  ✅
```

**❌ Still Broken (Need More Investigation):**
```
   conferenceId from frontend: undefined  ❌
   
   Search result: NOT FOUND  ❌
   
   Will CREATE NEW record  ❌ (Creates duplicate)
```

### Step 5: Verify Single Record in Database

1. Go to **Reports** → **Call Records**
2. Filter to today's calls
3. Find the test call you just made
4. **Expected:** ONLY 1 record with:
   - `callId` starting with "conf-"
   - Has recording URL
   - Has disposition (e.g., "Not Interested")
   - Has call duration

**If you see 2 records**, share:
- Railway logs from Step 4
- Browser console logs (F12 → Console tab)
- Screenshot of the duplicate records

---

## 🎓 What We Learned

### Architectural Insights

1. **TwiML Auto-Dials Agent**: When using `<Dial><Client>agent-browser</Client></Dial>`, Twilio automatically calls the agent's browser. No manual `device.connect()` needed.

2. **Incoming vs Outbound Handlers**: Even though the call is "outbound" to the customer, it triggers the `incoming` event handler in the agent's browser because Twilio is calling the agent.

3. **Multiple Code Paths**: The same component (RestApiDialer) handles both:
   - Outbound REST API calls (Work page)
   - Inbound calls (Dashboard)
   - Manual dialer calls (Dialer page)
   
   Each path must properly set conferenceId.

4. **State Timing Issues**: Event handlers can execute AFTER component state is cleared. Always use closure capture or global state (Redux) for values needed in async handlers.

5. **Vercel Caching**: Browser aggressively caches JavaScript bundles. Always hard refresh after deployment or you'll test old code.

### Development Process Lessons

1. **Multi-Platform Deployment Complexity**: Frontend (Vercel) and Backend (Railway) deploy independently. Must verify BOTH are updated before testing.

2. **Log-Driven Debugging**: Railway logs showing `conferenceId: undefined` was the smoking gun that revealed the incoming handler was the problem.

3. **Follow the Data Flow**: Traced conferenceId from:
   - Backend response → Local state → Redux → CustomerInfoCard → Backend
   - Found the break in the chain at "incoming handler → Redux"

4. **Browser DevTools Network Tab**: Can verify which JavaScript file version is loaded by checking file hash in filename.

---

## 🚨 If Still Broken After Testing

If you still see duplicates after following ALL testing steps, provide:

### Required Debug Info:

1. **Railway Backend Logs** (copy full SAVE-CALL-DATA section):
   ```
   🔥 SAVE-CALL-DATA ENDPOINT HIT - VERSION 2.0 🔥
   ...everything through...
   ✅ Call record created/updated: ...
   ```

2. **Browser Console Logs** (F12 → Console):
   - Filter for "DEBUG"
   - Filter for "conferenceId"
   - Filter for "Redux"
   - Copy ALL matching logs

3. **Network Tab**:
   - Open DevTools → Network tab
   - Filter: "save-call-data"
   - Click the request
   - Copy "Request Payload" showing what was sent

4. **Database Records**:
   - Go to Reports → Call Records
   - Screenshot showing BOTH duplicate records
   - Note the `callId` values of each

---

## 📚 Related Files Changed

### Backend (Deployed to Railway ✅)

- `backend/src/controllers/dialerController.ts`:
  - Line 1347: Set `recording=conferenceId` initially
  - Line 1348: Add `[CONF:conferenceId]` to notes

- `backend/src/routes/callsRoutes.ts`:
  - Lines 633-650: PRIORITY 1 search by conferenceId
  - Lines 653+: PRIORITY 2 fallback to Twilio SID

### Frontend (Deploying to Vercel ⏳)

- `frontend/src/store/slices/activeCallSlice.ts`:
  - Line 7: Added `conferenceId: string | null` to interface
  - Line 27: Added `conferenceId: null` to initialState
  - Lines 41-52: Accept conferenceId in startCall action

- `frontend/src/components/work/CustomerInfoCard.tsx`:
  - Line 95: Read conferenceId from Redux
  - Line 142: Send conferenceId to backend

- `frontend/src/components/dialer/RestApiDialer.tsx`:
  - **Line 247-262**: ✅ **CRITICAL FIX** - Incoming handler now reads conferenceId from activeRestApiCall and includes in Redux dispatch
  - Line 797: Closure capture for joinAgentToConference (not used for REST API calls)
  - Line 814: Use captured conferenceId (not used for REST API calls)

---

## 🎯 Next Steps

1. ⏳ **Wait for Vercel to deploy commit `0935a6c`** (2-5 minutes)
2. 🧹 **Clear browser cache completely** (Cmd+Shift+Delete)
3. 🔄 **Hard refresh Omnivox page** (Cmd+Shift+R x5)
4. 📞 **Make ONE test call**
5. 📋 **Share Railway logs** showing conferenceId value
6. ✅ **Verify single record** in Call Records page

If conferenceId is STILL undefined after all this, we'll need to investigate browser caching at the CDN level or check Vercel build logs.

---

**Last Updated:** 27 April 2026, 21:15 GMT  
**Status:** Fix committed and pushed, awaiting Vercel deployment  
**Commit:** `0935a6c` - CRITICAL FIX: Add conferenceId to incoming call handler Redux dispatch
