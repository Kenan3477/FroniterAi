# 🎵 TWILIO TTS AUDIT & REPLACEMENT PLAN

## Executive Summary
**Objective:** Disable ALL Twilio TTS and replace with user-uploaded audio files
**Status:** IN PROGRESS
**Priority:** CRITICAL - User requirement for production telephony

---

## TTS Usage Audit

### ✅ ALREADY DISABLED (No Action Needed)

#### 1. Inbound Call Controller
**File:** `backend/src/controllers/inboundCallController.ts`
**Status:** ✅ TTS ALREADY DISABLED
**Implementation:**
- All greeting/voicemail/out-of-hours use audio files
- Silent hangup on errors (no TTS error messages)
- Comments clearly state "NO TTS ALLOWED"

**Key Functions:**
- `generateOutOfHoursTwiML()` - Uses `outOfHoursAudioUrl` or `voicemailAudioUrl`
- `generateQueueTwiML()` - Uses `greetingAudioUrl` + `queueAudioUrl`
- `generateDirectAgentRingTwiML()` - Uses `greetingAudioUrl`
- All error paths: Silent hangup (no TTS)

#### 2. Dialer Controller
**File:** `backend/src/controllers/dialerController.ts`
**Status:** ✅ TTS ALREADY DISABLED
**Implementation:**
- Uses hold music URLs instead of TTS
- All comments indicate "no TTS"

#### 3. Twilio Service
**File:** `backend/src/services/twilioService.ts`
**Status:** ✅ TTS ALREADY DISABLED
**Implementation:**
- Silent connections (no TTS greetings)
- Hold music instead of TTS
- All comments indicate "NO TTS"

---

### ❌ ACTIVE TTS USAGE (Needs Replacement)

#### 1. Enhanced TwiML Service
**File:** `backend/src/services/enhancedTwiMLService.ts`
**Status:** ❌ ACTIVE TTS IN USE
**Priority:** HIGH

**TTS Instances Found:**

##### Instance 1: Inbound Greeting (Line 169)
```typescript
twiml.say({
  voice: 'alice',
  language: 'en-GB'
}, 'Thank you for calling. Please hold while I connect you to an available agent.');
```
**Frequency:** Every inbound call that uses this service
**Replacement:** Use `greetingAudioUrl` from inbound number configuration

##### Instance 2: Agents Busy (Line 188)
```typescript
twiml.say('All our agents are currently busy. Please call back later or leave a voicemail.');
```
**Frequency:** When queue overflows
**Replacement:** Use `busyAudioUrl` or `noAnswerAudioUrl` from inbound number

##### Instance 3: Transfer Initiating (Line 237)
```typescript
twiml.say('Transferring your call, please hold.');
```
**Frequency:** Every call transfer
**Replacement:** Use dedicated `transferAudioUrl` field (needs to be added to schema)

##### Instance 4: Transfer Failed (Line 244)
```typescript
twiml.say('The transfer was unsuccessful. Returning to original call.');
```
**Frequency:** Failed transfers
**Replacement:** Use `transferFailedAudioUrl` (needs to be added to schema)

##### Instance 5: Call on Hold (Line 263)
```typescript
twiml.say('Your call is being placed on hold. Please wait for an available agent.');
```
**Frequency:** When call is parked
**Replacement:** Use `holdAudioUrl` or just play hold music

##### Instance 6: Voicemail Prompt (Line 288)
```typescript
twiml.say({
  voice: 'alice',
  language: 'en-GB'
}, 'Please leave your message after the beep. Press any key when finished.');
```
**Frequency:** Every voicemail
**Replacement:** Use `voicemailPromptAudioUrl` from inbound number

##### Instance 7: Voicemail Thank You (Line 302)
```typescript
twiml.say('Thank you for your message. Goodbye.');
```
**Frequency:** After every voicemail
**Replacement:** Use `voicemailThankyouAudioUrl` (needs to be added to schema)

#### 2. Audio Service (TTS Fallback)
**File:** `backend/src/services/audioService.ts`
**Status:** ⚠️ HAS TTS FALLBACK (Line 196)
**Priority:** MEDIUM

**Code:**
```typescript
static playOrSay(
  twiml: twilio.twiml.VoiceResponse,
  audioFilename: string,
  ttsText: string,
  useAudio: boolean = true,
  voice: any = { voice: 'alice', language: 'en-GB' }
): void {
  if (useAudio) {
    twiml.play(this.getUrl(audioFilename));
  } else {
    twiml.say(voice, ttsText);
  }
}
```
**Issue:** Method allows TTS fallback via `useAudio: false`
**Fix:** Remove TTS branch entirely, always use audio

---

## Database Schema Requirements

### Current Audio Fields (InboundNumber model)
✅ Already exist:
- `greetingAudioUrl` - Main greeting
- `voicemailAudioUrl` - Voicemail prompt
- `outOfHoursAudioUrl` - Out of hours message
- `noAnswerAudioUrl` - No answer message
- `busyAudioUrl` - All agents busy message

### New Audio Fields Needed
❌ Need to add:
- `transferAudioUrl` - "Transferring your call..."
- `transferFailedAudioUrl` - "Transfer unsuccessful..."
- `holdAudioUrl` - "Call being placed on hold..."
- `voicemailThankyouAudioUrl` - "Thank you for your message..."
- `queueAudioUrl` - Hold music/queue audio (may already exist - need to verify)

---

## Implementation Plan

### Phase 1: Add Missing Database Fields ⚠️ REQUIRED FIRST
**Action:** Add new audio URL fields to InboundNumber schema
**Files to modify:**
- `backend/prisma/schema.prisma` - Add new fields
- Run migration: `npx prisma migrate dev`

### Phase 2: Replace Enhanced TwiML Service TTS
**Action:** Replace all `twiml.say()` calls with `twiml.play()`
**File:** `backend/src/services/enhancedTwiMLService.ts`

**Changes:**
1. Add inboundNumber parameter to all functions
2. Replace each TTS call with audio file URL
3. Add error handling for missing audio (silent fail, not TTS fallback)

### Phase 3: Remove TTS Fallback from Audio Service
**Action:** Make audio-only (no TTS option)
**File:** `backend/src/services/audioService.ts`

**Changes:**
1. Remove `playOrSay()` method entirely
2. Keep only `play()` functionality
3. Update documentation

### Phase 4: Frontend Audio Upload
**Action:** Ensure users can upload all audio types
**Files:** Frontend audio upload components

**Requirements:**
- Upload interface for all audio fields
- Preview/play uploaded audio
- Clear labeling of what each audio is for
- File format validation (MP3, WAV)

### Phase 5: Default Audio Files
**Action:** Provide professional default audio files
**Options:**
1. Record professional voice talent
2. Purchase from audio marketplace
3. Use AI voice generation (ElevenLabs, etc.)

---

## Replacement Strategy

### For Each TTS Instance:

#### Step 1: Identify Context
- What scenario triggers this TTS?
- What inbound number/campaign is involved?
- Is this inbound or outbound?

#### Step 2: Determine Audio Source
- Which database field should provide the audio?
- Does the field exist? If not, add it.
- What's the fallback if audio is missing?

#### Step 3: Update Code
```typescript
// ❌ OLD (TTS)
twiml.say('Thank you for calling');

// ✅ NEW (Audio)
if (inboundNumber.greetingAudioUrl) {
  twiml.play(inboundNumber.greetingAudioUrl);
} else {
  // Silent fail or default audio
  console.error('❌ No greeting audio configured');
  twiml.hangup();
}
```

#### Step 4: Test
- Verify audio plays correctly
- Check error handling
- Confirm no TTS fallback triggers

---

## Testing Checklist

### Inbound Calls
- [ ] Greeting plays (greetingAudioUrl)
- [ ] Out of hours message plays (outOfHoursAudioUrl)
- [ ] Voicemail prompt plays (voicemailAudioUrl)
- [ ] No answer message plays (noAnswerAudioUrl)
- [ ] Busy message plays (busyAudioUrl)
- [ ] No TTS heard anywhere

### Call Transfers
- [ ] Transfer initiation message plays (transferAudioUrl)
- [ ] Transfer failed message plays (transferFailedAudioUrl)
- [ ] No TTS heard

### Voicemail
- [ ] Prompt plays (voicemailAudioUrl)
- [ ] Thank you message plays (voicemailThankyouAudioUrl)
- [ ] No TTS heard

### Error Scenarios
- [ ] Missing audio → Silent hangup (no TTS)
- [ ] Invalid audio URL → Silent hangup (no TTS)
- [ ] Network error → Silent hangup (no TTS)

---

## Risks & Mitigation

### Risk 1: Missing Audio Files
**Impact:** Calls hang up silently, poor UX
**Mitigation:**
- Provide professional default audio files
- Clear UI warnings when audio not configured
- Validation before going live

### Risk 2: Audio File Accessibility
**Impact:** Twilio can't reach audio URLs
**Mitigation:**
- Use CDN with high availability
- Test URL accessibility from Twilio servers
- Monitor 404 errors

### Risk 3: Migration Period
**Impact:** Some audio missing during transition
**Mitigation:**
- Add default audio files first
- Migrate one feature at a time
- Keep TTS as emergency fallback initially (then remove)

---

## Success Criteria

✅ **Complete when:**
1. Zero `twiml.say()` calls in codebase
2. All audio fields in database
3. Frontend upload working for all audio types
4. Default audio files provided
5. Production testing passed
6. No TTS charges on Twilio bill

---

## Next Steps

### Immediate Actions:
1. ✅ Complete this audit (DONE)
2. ⚠️ Add missing database fields
3. ⚠️ Replace Enhanced TwiML Service TTS
4. ⚠️ Remove Audio Service TTS fallback
5. ⚠️ Test all scenarios

### User Action Required:
1. 📤 Upload audio files for each prompt type
2. 🎯 Verify audio plays correctly in production
3. 📊 Monitor call quality without TTS

---

## File Summary

**Files with Active TTS (Require Changes):**
1. `backend/src/services/enhancedTwiMLService.ts` - 7 instances
2. `backend/src/services/audioService.ts` - 1 fallback method

**Files Already TTS-Free:**
1. `backend/src/controllers/inboundCallController.ts` ✅
2. `backend/src/controllers/dialerController.ts` ✅
3. `backend/src/services/twilioService.ts` ✅

**Database Schema:**
1. `backend/prisma/schema.prisma` - Needs new fields added

---

**Status:** Ready to begin implementation
**Estimated Time:** 2-3 hours
**Complexity:** Medium (database migration + code changes)
