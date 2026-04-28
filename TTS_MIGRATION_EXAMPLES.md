# Example Implementation - TTS to Audio Migration

This file shows exactly how to replace each TTS instance with audio files.

---

## Example 1: Inbound Call Greeting (HIGH PRIORITY)

### File: `backend/src/services/enhancedTwiMLService.ts`

**BEFORE (Lines 169-172):**
```typescript
if (options?.enableGreeting !== false) {
  twiml.say({
    voice: 'alice',
    language: 'en-GB'
  }, 'Thank you for calling. Please hold while I connect you to an available agent.');
}
```

**AFTER:**
```typescript
import AudioService from './audioService';

if (options?.enableGreeting !== false) {
  twiml.play(AudioService.getUrl(AudioService.INBOUND_GREETING));
}
```

---

## Example 2: Queue Overflow (HIGH PRIORITY)

### File: `backend/src/services/enhancedTwiMLService.ts`

**BEFORE (Line 188):**
```typescript
// Fallback if no agents available
twiml.say('All our agents are currently busy. Please call back later or leave a voicemail.');
```

**AFTER:**
```typescript
// Fallback if no agents available
twiml.play(AudioService.getUrl(AudioService.AGENTS_BUSY));
```

---

## Example 3: Outbound Customer Greeting (HIGH PRIORITY)

### File: `backend/src/routes/productionDialerRoutes.ts`

**BEFORE (Lines 173-176):**
```typescript
// Add a brief greeting to establish connection
twiml.say({
  voice: 'alice',
  language: 'en-US'
}, 'Please hold while we connect you to an agent.');
```

**AFTER:**
```typescript
import AudioService from '../services/audioService';

// Add a brief greeting to establish connection
twiml.play(AudioService.getUrl(AudioService.CUSTOMER_CONNECTING));
```

---

## Example 4: Call Transfer Notification (MEDIUM PRIORITY)

### File: `backend/src/services/enhancedTwiMLService.ts`

**BEFORE (Line 237):**
```typescript
twiml.say('Transferring your call, please hold.');
```

**AFTER:**
```typescript
twiml.play(AudioService.getUrl(AudioService.TRANSFER_INITIATING));
```

---

## Example 5: Agent Connection (MEDIUM PRIORITY)

### File: `backend/src/routes/inboundCallRoutes.ts`

**BEFORE (Lines 313-316):**
```typescript
// Brief connection message
twiml.say({
  voice: 'alice',
  language: 'en-US'
}, 'Connecting you to the customer...');
```

**AFTER:**
```typescript
import AudioService from '../services/audioService';

// Brief connection message
twiml.play(AudioService.getUrl(AudioService.AGENT_CONNECTING_INBOUND));
```

---

## Complete File Examples

### Full Migration: `backend/src/services/enhancedTwiMLService.ts`

**Add import at top of file:**
```typescript
import AudioService from './audioService';
```

**Then replace all 8 TTS instances:**

```typescript
// Line 169-172: Inbound greeting
if (options?.enableGreeting !== false) {
  twiml.play(AudioService.getUrl(AudioService.INBOUND_GREETING));
}

// Line 188: Queue overflow
twiml.play(AudioService.getUrl(AudioService.AGENTS_BUSY));

// Line 237: Transfer initiation
twiml.play(AudioService.getUrl(AudioService.TRANSFER_INITIATING));

// Line 244: Transfer failed
twiml.play(AudioService.getUrl(AudioService.TRANSFER_FAILED));

// Line 263: Call on hold
twiml.play(AudioService.getUrl(AudioService.CALL_ON_HOLD));

// Line 288-291: Voicemail prompt
twiml.play(AudioService.getUrl(AudioService.VOICEMAIL_PROMPT));

// Line 302: Voicemail thank you
twiml.play(AudioService.getUrl(AudioService.VOICEMAIL_THANKYOU));
```

---

### Full Migration: `backend/src/routes/productionDialerRoutes.ts`

**Add import at top of file:**
```typescript
import AudioService from '../services/audioService';
```

**Then replace all 5 TTS instances:**

```typescript
// Line 173-176: Customer connecting
twiml.play(AudioService.getUrl(AudioService.CUSTOMER_CONNECTING));

// Line 190-193: Agents unavailable
twiml.play(AudioService.getUrl(AudioService.AGENTS_UNAVAILABLE));

// Line 205: System error
errorTwiml.play(AudioService.getUrl(AudioService.SYSTEM_ERROR));

// Line 227: Agent connecting (conference)
twiml.play(AudioService.getUrl(AudioService.AGENT_CONNECTING_CONFERENCE));

// Line 238: Agent connected
twiml.play(AudioService.getUrl(AudioService.AGENT_CONNECTED));

// Line 255: Connection failed
errorTwiml.play(AudioService.getUrl(AudioService.CONNECTION_FAILED));
```

---

### Full Migration: `backend/src/routes/inboundCallRoutes.ts`

**Add import at top of file:**
```typescript
import AudioService from '../services/audioService';
```

**Replace the 1 TTS instance:**

```typescript
// Line 313-316: Agent connecting
twiml.play(AudioService.getUrl(AudioService.AGENT_CONNECTING_INBOUND));
```

---

## Testing Each Change

After each replacement, test with curl:

```bash
# Test inbound call TwiML generation
curl -X POST http://localhost:8080/api/calls/inbound \
  -H "Content-Type: application/json" \
  -d '{"From": "+447123456789", "To": "+442012345678"}'

# Expected TwiML output:
# <Response>
#   <Play>https://froniterai-production.up.railway.app/audio/inbound-greeting.mp3</Play>
#   <Dial>...</Dial>
# </Response>
```

---

## Rollback Plan

If audio files fail to load, you can quickly roll back by commenting out the new code:

```typescript
// ROLLBACK: Temporarily use TTS while audio issue is resolved
// twiml.play(AudioService.getUrl(AudioService.INBOUND_GREETING));
twiml.say({
  voice: 'alice',
  language: 'en-GB'
}, 'Thank you for calling. Please hold while I connect you to an available agent.');
```

---

## Environment Variable Setup

Add to Railway environment variables:

```bash
# Option 1: Railway public folder
AUDIO_CDN_URL=https://froniterai-production.up.railway.app/audio

# Option 2: AWS S3
AUDIO_CDN_URL=https://omnivox-audio-prompts.s3.amazonaws.com

# Option 3: Cloudflare R2 (if using)
AUDIO_CDN_URL=https://audio.omnivox.ai
```

---

## Verification Endpoint

Add this test endpoint to verify audio files work:

```typescript
// backend/src/routes/testAudioRoutes.ts
import { Router } from 'express';
import AudioService from '../services/audioService';

const router = Router();

/**
 * GET /api/test/audio/verify
 * Test endpoint to verify all audio files are accessible
 */
router.get('/verify', async (req, res) => {
  try {
    const result = await AudioService.verifyAllFiles();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'All audio files are accessible',
        urls: AudioService.getAllUrls()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Some audio files are not accessible',
        missing: result.missing,
        urls: AudioService.getAllUrls()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/audio/twiml
 * Generate sample TwiML with audio files to test in Twilio console
 */
router.get('/twiml', (req, res) => {
  const twilio = require('twilio');
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Play each audio file in sequence for testing
  twiml.play(AudioService.getUrl(AudioService.INBOUND_GREETING));
  twiml.pause({ length: 1 });
  twiml.play(AudioService.getUrl(AudioService.CUSTOMER_CONNECTING));
  twiml.pause({ length: 1 });
  twiml.play(AudioService.getUrl(AudioService.AGENTS_BUSY));
  
  res.type('text/xml');
  res.send(twiml.toString());
});

export default router;
```

Then test with:
```bash
# Verify all files are accessible
curl http://localhost:8080/api/test/audio/verify

# Get test TwiML
curl http://localhost:8080/api/test/audio/twiml
```

---

## Gradual Migration Approach

If you want to migrate gradually (recommended for safety):

### Week 1: High Priority Only

```typescript
// Replace only the 4 most critical prompts
import AudioService from '../services/audioService';

// 1. Inbound greeting (most frequent)
twiml.play(AudioService.getUrl(AudioService.INBOUND_GREETING));

// 2. Agents busy (high visibility)
twiml.play(AudioService.getUrl(AudioService.AGENTS_BUSY));

// 3. Customer connecting outbound (every outbound call)
twiml.play(AudioService.getUrl(AudioService.CUSTOMER_CONNECTING));

// 4. Agents unavailable (customer-facing)
twiml.play(AudioService.getUrl(AudioService.AGENTS_UNAVAILABLE));

// Keep all other TTS as-is for now
```

### Week 2: Medium Priority

Add the operational prompts:
```typescript
// 5-9. Transfer, hold, agent connection prompts
twiml.play(AudioService.getUrl(AudioService.TRANSFER_INITIATING));
// ... etc
```

### Week 3: Low Priority

Add the error handlers:
```typescript
// 10-14. Voicemail and error prompts
twiml.play(AudioService.getUrl(AudioService.VOICEMAIL_PROMPT));
// ... etc
```

This way you can monitor each batch and roll back if needed.

---

## Next Step

Would you like me to:
1. **Implement all changes now** (I can modify all 3 files)
2. **Start with high priority only** (just the 4 most important)
3. **Create the test endpoint first** (so you can verify audio files work)

Let me know and I'll proceed!
