# 🎙️ MANDATORY CALL RECORDING RULE

## ⚠️ CRITICAL SYSTEM REQUIREMENT

**CALL RECORDING IS MANDATORY FOR ALL CALLS IN OMNIVOX-AI**

This is a **NON-NEGOTIABLE** system requirement for:
- Legal compliance and regulations
- Quality assurance and training
- Dispute resolution
- Performance monitoring
- Sales verification
- Customer service improvement

---

## 🚨 ABSOLUTE RULES

### Rule #1: Every Outbound Call MUST Be Recorded
**NO EXCEPTIONS**

Every call initiated through:
- Manual dialer (REST API)
- Auto-dialer
- Predictive dialer
- Any future dialing mechanism

**MUST include these recording parameters:**

```typescript
{
  record: 'record-from-answer-dual',
  recordingStatusCallback: `${process.env.BACKEND_URL}/api/calls/recording-callback`,
  recordingStatusCallbackMethod: 'POST',
  recordingChannels: 'dual',
  recordingStatusCallbackEvent: ['completed']
}
```

### Rule #2: Recording Parameters Are Immutable
**NEVER** remove, comment out, or disable recording parameters from:
- `backend/src/controllers/dialerController.ts` (lines 1119-1147)
- `backend/src/services/autoDialEngine.ts`
- `backend/src/services/autoDialEngineEnhanced.ts`
- Any future call initiation code

### Rule #3: TwiML Recording Is Required
All TwiML responses for call connections MUST include:
```xml
<Dial record="record-from-answer-dual" 
      recordingStatusCallback="..." 
      recordingStatusCallbackMethod="POST">
```

Located in:
- `backend/src/services/twilioService.ts` (lines 262-264)

### Rule #4: Validation Before Deployment
Before ANY deployment that touches call logic:
1. Run validation script: `node validate-recording-enforcement.js`
2. Verify recording parameters are present
3. Test with real call
4. Confirm recording appears in database

---

## 📋 IMPLEMENTATION CHECKLIST

### ✅ Backend Requirements
- [ ] Call-level recording parameters in `twilioClient.calls.create()`
- [ ] TwiML-level recording in `<Dial>` verb
- [ ] Recording callback endpoint: `/api/calls/recording-callback`
- [ ] Database column: `call_records.recording` (stores Twilio Recording SID)
- [ ] Recording status tracking
- [ ] Error handling for failed recordings

### ✅ Database Requirements
- [ ] `recording` column in `call_records` table (String, nullable but should always be filled)
- [ ] Recording SID format: `RExxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (34 characters)
- [ ] Index on `recording` column for fast lookups

### ✅ Monitoring Requirements
- [ ] Alert if calls created without recording parameter
- [ ] Daily report of recording coverage % (should be 100%)
- [ ] Automated check: All calls > 5s duration should have recording
- [ ] Webhook monitoring for recording completion

---

## 🔍 VALIDATION COMMANDS

### Check Current Implementation
```bash
# Verify recording parameters exist in code
grep -n "record.*record-from-answer-dual" backend/src/controllers/dialerController.ts
grep -n "recordingStatusCallback" backend/src/controllers/dialerController.ts

# Check TwiML service
grep -n "record.*record-from-answer" backend/src/services/twilioService.ts
```

### Check Database Coverage
```sql
-- Should return close to 100%
SELECT 
  COUNT(*) FILTER (WHERE recording IS NOT NULL) * 100.0 / COUNT(*) as coverage_percentage,
  COUNT(*) FILTER (WHERE recording IS NOT NULL) as with_recording,
  COUNT(*) FILTER (WHERE recording IS NULL) as without_recording
FROM call_records 
WHERE duration > 5 
  AND start_time > NOW() - INTERVAL '7 days'
  AND phone_number NOT LIKE 'client:%';
```

### Test New Call Recording
```bash
# Make test call and verify recording
node test-call-recording.js
```

---

## 🚫 WHAT NEVER TO DO

### ❌ FORBIDDEN ACTIONS

1. **NEVER** remove recording parameters from call creation
2. **NEVER** comment out recording configuration
3. **NEVER** disable recording "temporarily" for testing
4. **NEVER** deploy code that creates calls without recording
5. **NEVER** rely solely on Twilio account-wide recording settings
6. **NEVER** assume recording "will be handled elsewhere"

### ❌ FORBIDDEN CODE PATTERNS

```typescript
// ❌ WRONG - No recording parameters
const call = await twilioClient.calls.create({
  to: phoneNumber,
  from: fromNumber,
  url: twimlUrl
});

// ❌ WRONG - Commented out recording
const call = await twilioClient.calls.create({
  to: phoneNumber,
  from: fromNumber,
  url: twimlUrl,
  // record: 'record-from-answer-dual', // TODO: Enable later
});

// ❌ WRONG - Conditional recording
const call = await twilioClient.calls.create({
  to: phoneNumber,
  from: fromNumber,
  url: twimlUrl,
  ...(shouldRecord && { record: 'record-from-answer-dual' })
});
```

### ✅ CORRECT PATTERN

```typescript
// ✅ CORRECT - Always include recording
const call = await twilioClient.calls.create({
  to: phoneNumber,
  from: fromNumber,
  url: twimlUrl,
  method: 'POST',
  statusCallback: `${process.env.BACKEND_URL}/api/calls/status`,
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  statusCallbackMethod: 'POST',
  // 🎙️ MANDATORY: Recording parameters
  record: 'record-from-answer-dual',
  recordingStatusCallback: `${process.env.BACKEND_URL}/api/calls/recording-callback`,
  recordingStatusCallbackMethod: 'POST',
  recordingChannels: 'dual',
  recordingStatusCallbackEvent: ['completed']
});
```

---

## 📊 WHY THIS MATTERS

### Historical Context
**April 22, 2026**: System had 889 calls, only 149 with recordings (16.8% coverage)

**Root Cause**: Recording was NOT enforced at call creation time. Relied on:
1. Twilio account-wide settings (unreliable, can be changed)
2. TwiML-only recording (only records dial leg, not full call)
3. Missing call-level parameters

**Result**: Lost recordings from:
- 158 old calls (December 2025 - April 21, 2026)
- 50 calls from April 22, 2026 (10:19 AM - 5:31 PM)

### What We Lost
- Sales verification recordings
- Compliance audit trails
- Quality assurance data
- Training materials
- Dispute resolution evidence

### The Fix (Deployed April 22, 2026 at 5:31 PM)
**Commit**: `61b55c4 - feat: Enforce call recording at Twilio call level`
- Added call-level recording parameters to dialerController.ts
- Made recording EXPLICIT and MANDATORY
- No longer dependent on account settings

---

## 🔧 MAINTENANCE

### Weekly Checks
1. Run recording coverage report
2. Verify no calls are missing recordings
3. Check recording webhook success rate
4. Review any recording errors in logs

### Monthly Review
1. Audit code for any changes to call creation logic
2. Verify recording parameters still present
3. Test recording in production
4. Review Twilio recording retention settings

### Deployment Checklist
Before deploying ANY changes to call-related code:
- [ ] Reviewed changes for recording parameter removal
- [ ] Ran validation script
- [ ] Tested with real call
- [ ] Verified recording appears in database within 90 seconds
- [ ] Checked logs for recording callback success

---

## 🆘 TROUBLESHOOTING

### "Call has no recording"
1. Check call duration (< 5s may not record)
2. Verify call actually connected (check status = 'completed')
3. Check backend logs for recording callback
4. Search Twilio console for recording by Call SID
5. If recording exists in Twilio but not DB, run backfill script

### "Recording parameter missing in code"
1. **STOP DEPLOYMENT IMMEDIATELY**
2. Restore recording parameters from this document
3. Test with call before deploying
4. Review git history to understand how it was removed
5. Update this document if needed

### "Twilio says recording disabled"
1. Check Twilio account settings (should be "caller controlled")
2. Verify recording parameters in call creation code
3. Test with simple curl to Twilio API
4. Contact Twilio support if needed

---

## 📞 CONTACTS & ESCALATION

If recording stops working:
1. **IMMEDIATE**: Roll back last deployment
2. **URGENT**: Check this document for correct implementation
3. **ESCALATE**: Contact system admin/DevOps
4. **INVESTIGATE**: Review git history and Twilio console

---

## 🔄 VERSION HISTORY

**v1.0** - April 22, 2026
- Initial documentation
- Established mandatory recording rule
- Documented historical failure
- Created validation procedures

---

## ⚖️ LEGAL & COMPLIANCE

**Recording Disclosure**: Ensure all calls include proper disclosure that calls are being recorded for quality and training purposes, as required by law in your jurisdiction.

**Retention Policy**: Maintain recordings for the legally required period in your industry/region.

**Access Control**: Limit recording access to authorized personnel only.

---

**REMEMBER**: Call recording is NOT optional. It is a critical system requirement. Treat recording parameters like security credentials - they must ALWAYS be present and correct.

**Last Updated**: April 22, 2026
**Status**: ACTIVE AND ENFORCED
