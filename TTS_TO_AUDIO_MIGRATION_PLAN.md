# 🎙️ Twilio TTS to Audio Files Migration Plan

**Date:** 28 April 2026  
**Objective:** Replace all Twilio Text-to-Speech (TTS) with pre-recorded audio files to reduce costs  
**Status:** ⏳ PLANNING - Ready for Implementation

---

## 📊 Cost Analysis

### Current TTS Costs (Estimated)

Twilio charges **$0.04 per minute** for TTS. Assuming:
- Average call duration: 3 minutes
- 1,000 calls/month
- Average 2 TTS prompts per call @ 5 seconds each

**Monthly TTS Cost:**
```
1,000 calls × 2 prompts × 5 seconds = 10,000 seconds = 166.67 minutes
166.67 minutes × $0.04 = $6.67/month
```

**Annual Savings:** ~$80/year (minimal but compounds at scale)

### Audio File Alternative

- **One-time cost:** Professional voice recording: £50-100 for all prompts
- **Ongoing cost:** $0.00 (files hosted on AWS S3/Railway public folder)
- **Latency improvement:** Pre-recorded audio plays instantly (no TTS synthesis delay)

---

## 🔍 Complete TTS Inventory

I've identified **14 TTS instances** across 3 files:

### 📁 File 1: `backend/src/services/enhancedTwiMLService.ts` (8 instances)

| Line | TTS Text | Context | Priority |
|------|----------|---------|----------|
| 169-172 | "Thank you for calling. Please hold while I connect you to an available agent." | Inbound call greeting | 🔴 HIGH |
| 188 | "All our agents are currently busy. Please call back later or leave a voicemail." | Queue overflow fallback | 🔴 HIGH |
| 237 | "Transferring your call, please hold." | Call transfer notification | 🟡 MEDIUM |
| 244 | "The transfer was unsuccessful. Returning to original call." | Transfer failure | 🟡 MEDIUM |
| 263 | "Your call is being placed on hold. Please wait for an available agent." | Call parking | 🟡 MEDIUM |
| 288-291 | "Please leave your message after the beep. Press any key when finished." | Voicemail prompt | 🟢 LOW |
| 302 | "Thank you for your message. Goodbye." | Voicemail completion | 🟢 LOW |

**Voice Configuration:** `voice: 'alice', language: 'en-GB'`

---

### 📁 File 2: `backend/src/routes/inboundCallRoutes.ts` (1 instance)

| Line | TTS Text | Context | Priority |
|------|----------|---------|----------|
| 313-316 | "Connecting you to the customer..." | Agent-to-customer connection | 🟡 MEDIUM |

**Voice Configuration:** `voice: 'alice', language: 'en-US'`

---

### 📁 File 3: `backend/src/routes/productionDialerRoutes.ts` (5 instances)

| Line | TTS Text | Context | Priority |
|------|----------|---------|----------|
| 173-176 | "Please hold while we connect you to an agent." | Outbound call customer greeting | 🔴 HIGH |
| 190-193 | "Sorry, all agents are currently busy. Please try again later." | Agent unavailable | 🔴 HIGH |
| 205 | "We apologize, but we are experiencing technical difficulties. Please try again later." | System error fallback | 🟢 LOW |
| 227 | "Connecting you to the customer." | Agent conference join | 🟡 MEDIUM |
| 238 | "You are now connected." | Direct connection confirmation | 🟡 MEDIUM |
| 255 | "Connection failed. Please try again." | Connection error | 🟢 LOW |

**Voice Configuration:** `voice: 'alice', language: 'en-US'`

---

## 🎯 Audio Files Required

### Priority Groups

#### 🔴 **HIGH PRIORITY** (4 files) - Customer-facing, high frequency

1. **`inbound-greeting.mp3`**
   - Text: "Thank you for calling. Please hold while I connect you to an available agent."
   - Voice: British English (Female, Professional)
   - Duration: ~5 seconds
   - Usage: Every inbound call

2. **`agents-busy.mp3`**
   - Text: "All our agents are currently busy. Please call back later or leave a voicemail."
   - Voice: British English (Female, Empathetic)
   - Duration: ~6 seconds
   - Usage: Queue overflow

3. **`customer-connecting-outbound.mp3`**
   - Text: "Please hold while we connect you to an agent."
   - Voice: American English (Female, Friendly)
   - Duration: ~4 seconds
   - Usage: Every outbound call to customer

4. **`agents-unavailable.mp3`**
   - Text: "Sorry, all agents are currently busy. Please try again later."
   - Voice: American English (Female, Apologetic)
   - Duration: ~5 seconds
   - Usage: Outbound call agent timeout

#### 🟡 **MEDIUM PRIORITY** (5 files) - Internal/operational

5. **`transfer-initiating.mp3`**
   - Text: "Transferring your call, please hold."
   - Voice: British English (Female, Calm)
   - Duration: ~3 seconds

6. **`transfer-failed.mp3`**
   - Text: "The transfer was unsuccessful. Returning to original call."
   - Voice: British English (Female, Informative)
   - Duration: ~4 seconds

7. **`call-on-hold.mp3`**
   - Text: "Your call is being placed on hold. Please wait for an available agent."
   - Voice: British English (Female, Reassuring)
   - Duration: ~5 seconds

8. **`agent-connecting-inbound.mp3`**
   - Text: "Connecting you to the customer..."
   - Voice: American English (Female, Professional)
   - Duration: ~2 seconds

9. **`agent-connecting-conference.mp3`**
   - Text: "Connecting you to the customer."
   - Voice: American English (Female, Brief)
   - Duration: ~2 seconds

10. **`agent-connected.mp3`**
    - Text: "You are now connected."
    - Voice: American English (Female, Confirmatory)
    - Duration: ~2 seconds

#### 🟢 **LOW PRIORITY** (4 files) - Error/edge cases

11. **`voicemail-prompt.mp3`**
    - Text: "Please leave your message after the beep. Press any key when finished."
    - Voice: British English (Female, Instructive)
    - Duration: ~5 seconds

12. **`voicemail-thankyou.mp3`**
    - Text: "Thank you for your message. Goodbye."
    - Voice: British English (Female, Warm)
    - Duration: ~2 seconds

13. **`system-error.mp3`**
    - Text: "We apologize, but we are experiencing technical difficulties. Please try again later."
    - Voice: American English (Female, Apologetic)
    - Duration: ~6 seconds

14. **`connection-failed.mp3`**
    - Text: "Connection failed. Please try again."
    - Voice: American English (Female, Brief)
    - Duration: ~2 seconds

---

## 🎙️ Recording Options

### Option 1: Professional Voice Talent (Recommended)

**Providers:**
- **Fiverr:** £20-50 for all 14 prompts (British + American voices)
- **Voices.com:** £50-100 (higher quality, faster turnaround)
- **Upwork:** £30-70 (custom negotiation)

**Requirements:**
- 2 voice actors (1 British English female, 1 American English female)
- Professional studio quality (16kHz minimum, 48kHz preferred)
- MP3 format, mono channel
- Commercial usage rights

**Timeline:** 2-3 days

---

### Option 2: AI Text-to-Speech (Budget Alternative)

**Providers:**
- **ElevenLabs:** $5/month (most natural sounding)
- **Play.ht:** $19/month (professional quality)
- **Amazon Polly:** $4 per 1 million characters (~$0.01 for all prompts)

**Pros:**
- Instant generation
- Easy to update
- Professional quality

**Cons:**
- Requires subscription/credits
- Slightly less natural than human voice
- May lack emotional nuance

**Timeline:** Same day

---

### Option 3: DIY Recording (Free)

**Requirements:**
- Good microphone (Blue Yeti, Audio-Technica ATR2100, etc.)
- Quiet room
- Audacity (free audio editing software)
- Native English speaker

**Cons:**
- Time-consuming
- May not sound as professional
- Difficult to match across multiple prompts

**Timeline:** 1-2 days

---

## 📦 Audio File Hosting

### Recommended: AWS S3 (Railway Public Folder Alternative)

**Setup:**
```bash
# Create S3 bucket
aws s3 mb s3://omnivox-audio-prompts

# Set public read permissions
aws s3api put-bucket-policy --bucket omnivox-audio-prompts --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::omnivox-audio-prompts/*"
  }]
}'

# Upload files
aws s3 sync ./audio-prompts/ s3://omnivox-audio-prompts/ --acl public-read
```

**URL Format:** `https://omnivox-audio-prompts.s3.amazonaws.com/inbound-greeting.mp3`

**Cost:** ~$0.01/month for 14 small MP3 files

---

### Alternative: Railway Public Folder

**Setup:**
```bash
# Create public directory
mkdir -p backend/public/audio

# Copy files
cp audio-prompts/*.mp3 backend/public/audio/

# Update .gitignore to include these files
echo "!backend/public/audio/*.mp3" >> .gitignore
```

**URL Format:** `https://froniterai-production.up.railway.app/audio/inbound-greeting.mp3`

**Serve static files in Express:**
```typescript
// backend/src/index.ts
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));
```

---

## 🔧 Implementation Steps

### Phase 1: Preparation (Day 1)

1. ✅ **Inventory Complete** (Already done above)

2. **Create Audio Specification Document**
   ```
   File: AUDIO_PROMPTS_SPEC.txt
   
   Prompt 1: inbound-greeting.mp3
   Text: "Thank you for calling. Please hold while I connect you to an available agent."
   Voice: British English, Female, Professional, Friendly
   Tone: Welcoming, Reassuring
   Pace: Medium
   Duration: ~5 seconds
   
   [Repeat for all 14 prompts]
   ```

3. **Order Professional Recordings** (or generate with AI)
   - Fiverr order: 2 voice actors (UK + US)
   - Delivery: 48-72 hours
   - Cost: £40-60

---

### Phase 2: Infrastructure Setup (Day 2)

4. **Create Audio Hosting**
   ```bash
   # Option A: AWS S3
   aws s3 mb s3://omnivox-audio-prompts
   
   # Option B: Railway public folder
   mkdir -p backend/public/audio
   ```

5. **Create Audio Service Module**
   ```typescript
   // backend/src/services/audioService.ts
   export class AudioService {
     private static BASE_URL = process.env.AUDIO_CDN_URL || 
       'https://omnivox-audio-prompts.s3.amazonaws.com';
     
     static getUrl(filename: string): string {
       return `${this.BASE_URL}/${filename}`;
     }
     
     // High priority prompts
     static readonly INBOUND_GREETING = this.getUrl('inbound-greeting.mp3');
     static readonly AGENTS_BUSY = this.getUrl('agents-busy.mp3');
     static readonly CUSTOMER_CONNECTING = this.getUrl('customer-connecting-outbound.mp3');
     // ... etc
   }
   ```

6. **Add Environment Variable**
   ```bash
   # Railway environment variables
   AUDIO_CDN_URL=https://omnivox-audio-prompts.s3.amazonaws.com
   ```

---

### Phase 3: Code Migration (Day 3)

7. **Replace TTS in enhancedTwiMLService.ts**

   **BEFORE:**
   ```typescript
   twiml.say({
     voice: 'alice',
     language: 'en-GB'
   }, 'Thank you for calling. Please hold while I connect you to an available agent.');
   ```

   **AFTER:**
   ```typescript
   twiml.play(AudioService.INBOUND_GREETING);
   ```

8. **Replace TTS in inboundCallRoutes.ts**

   **BEFORE:**
   ```typescript
   twiml.say({
     voice: 'alice',
     language: 'en-US'
   }, 'Connecting you to the customer...');
   ```

   **AFTER:**
   ```typescript
   twiml.play(AudioService.AGENT_CONNECTING_INBOUND);
   ```

9. **Replace TTS in productionDialerRoutes.ts**

   **BEFORE:**
   ```typescript
   twiml.say({
     voice: 'alice',
     language: 'en-US'
   }, 'Please hold while we connect you to an agent.');
   ```

   **AFTER:**
   ```typescript
   twiml.play(AudioService.CUSTOMER_CONNECTING);
   ```

---

### Phase 4: Testing (Day 4)

10. **Test Each Call Flow**
    - ✅ Inbound call → greeting plays correctly
    - ✅ Outbound call → customer hears greeting
    - ✅ Agent unavailable → busy message plays
    - ✅ Call transfer → transfer prompts play
    - ✅ Voicemail → voicemail prompts play
    - ✅ Error scenarios → error messages play

11. **Verify Audio Quality**
    - Clear audio (no distortion)
    - Appropriate volume
    - No clipping or background noise
    - Consistent across all files

12. **Load Testing**
    - Make 50 test calls
    - Verify audio plays every time
    - Check for any CDN/S3 rate limits

---

### Phase 5: Deployment (Day 5)

13. **Upload Audio Files**
    ```bash
    aws s3 sync ./audio-prompts/ s3://omnivox-audio-prompts/ --acl public-read
    ```

14. **Deploy Code Changes**
    ```bash
    git add backend/src/services/audioService.ts
    git add backend/src/services/enhancedTwiMLService.ts
    git add backend/src/routes/inboundCallRoutes.ts
    git add backend/src/routes/productionDialerRoutes.ts
    git commit -m "COST REDUCTION: Replace all Twilio TTS with pre-recorded audio files"
    git push
    ```

15. **Monitor Production**
    - Check Railway logs for any errors
    - Verify first 100 calls use audio files
    - Monitor Twilio usage dashboard (should see TTS usage drop to zero)

---

## 📝 Implementation Checklist

- [ ] **Preparation**
  - [x] Complete TTS inventory (14 instances identified)
  - [ ] Create audio specification document
  - [ ] Order professional voice recordings (OR generate with ElevenLabs)
  - [ ] Receive and review audio files

- [ ] **Infrastructure**
  - [ ] Create AWS S3 bucket OR Railway public folder
  - [ ] Upload audio files
  - [ ] Verify public URLs work
  - [ ] Create AudioService module
  - [ ] Add AUDIO_CDN_URL environment variable

- [ ] **Code Changes**
  - [ ] Replace TTS in enhancedTwiMLService.ts (8 instances)
  - [ ] Replace TTS in inboundCallRoutes.ts (1 instance)
  - [ ] Replace TTS in productionDialerRoutes.ts (5 instances)
  - [ ] Update error handling to fallback to TTS if audio fails

- [ ] **Testing**
  - [ ] Test inbound call flow
  - [ ] Test outbound call flow
  - [ ] Test agent connection flows
  - [ ] Test error scenarios
  - [ ] Test voicemail flow
  - [ ] Verify audio quality on different devices

- [ ] **Deployment**
  - [ ] Deploy to Railway
  - [ ] Monitor first 100 production calls
  - [ ] Verify TTS usage drops to $0
  - [ ] Document new audio update process

---

## 🚨 Fallback Strategy

**If audio file fails to load**, fall back to TTS:

```typescript
// backend/src/services/audioService.ts
export class AudioService {
  static playOrSay(
    twiml: twilio.twiml.VoiceResponse,
    audioFile: string,
    fallbackText: string,
    voice: { voice: string; language: string } = { voice: 'alice', language: 'en-GB' }
  ): void {
    try {
      // Try to play audio file
      twiml.play(this.getUrl(audioFile));
    } catch (error) {
      console.error(`❌ Failed to play audio file ${audioFile}, falling back to TTS:`, error);
      // Fallback to TTS
      twiml.say(voice, fallbackText);
    }
  }
}
```

**Usage:**
```typescript
AudioService.playOrSay(
  twiml,
  'inbound-greeting.mp3',
  'Thank you for calling. Please hold while I connect you to an available agent.',
  { voice: 'alice', language: 'en-GB' }
);
```

---

## 💰 Cost Breakdown

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Professional voice recordings (14 prompts) | £50 | Fiverr/Voices.com |
| Audio editing/mastering | £0 | Included in voice talent fee |
| **Total One-Time** | **£50** | |

### Monthly Recurring Costs

| Item | Current (TTS) | After Migration | Savings |
|------|---------------|-----------------|---------|
| Twilio TTS (1,000 calls/month) | $6.67 | $0.00 | $6.67 |
| Audio file hosting (S3) | $0.00 | $0.01 | -$0.01 |
| **Total Monthly** | **$6.67** | **$0.01** | **$6.66** |

### Annual Savings

- **Year 1:** $80 - £50 = **$15 net savings** (after initial investment)
- **Year 2+:** **$80/year savings** (no additional costs)
- **5-Year Total:** **$385 savings**

### Intangible Benefits

- **Faster playback:** Audio files load instantly (no TTS synthesis delay ~500ms)
- **Consistent quality:** Same voice/quality every time
- **Professional branding:** Customizable to exact brand voice
- **Easy updates:** Just replace MP3 file, no code changes needed

---

## 🎯 Recommended Action

### Immediate (This Week)

1. **Order professional recordings from Fiverr** (£40-50, 48-hour delivery)
   - Search: "British English female voiceover"
   - Search: "American English female voiceover"
   - Send audio spec document with all 14 prompts

2. **Set up S3 bucket** (10 minutes)
   ```bash
   aws s3 mb s3://omnivox-audio-prompts
   ```

3. **Create AudioService module** (30 minutes)
   - Centralized URL management
   - Fallback to TTS if audio fails

### Next Week

4. **Receive and review audio files** (Day 1)
5. **Upload to S3 and test URLs** (Day 2)
6. **Replace TTS in code** (Day 3)
7. **Test all call flows** (Day 4)
8. **Deploy to production** (Day 5)

---

## 📚 Additional Resources

### Voice Recording Services

- **Fiverr:** https://www.fiverr.com/categories/music-audio/voice-overs
- **Voices.com:** https://www.voices.com/
- **Upwork:** https://www.upwork.com/hire/voice-over-freelancers/

### AI TTS Alternatives

- **ElevenLabs:** https://elevenlabs.io/ (Best quality)
- **Play.ht:** https://play.ht/
- **Amazon Polly:** https://aws.amazon.com/polly/

### AWS S3 Documentation

- **Creating bucket:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html
- **Public access:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteAccessPermissionsReqd.html

---

**Next Step:** Shall I create the AudioService module and start implementing the high-priority replacements (inbound greeting, agents busy, customer connecting)?
