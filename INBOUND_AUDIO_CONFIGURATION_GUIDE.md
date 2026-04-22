# 🎵 Inbound Call Audio Configuration Guide

## ⚠️ CRITICAL CHANGE: TTS Completely Disabled

**All Twilio text-to-speech has been removed from the inbound call system.**

Your inbound numbers **MUST** have audio files configured before they can receive calls properly.

---

## 📋 Required Audio Files

### 1. **Greeting Audio** (REQUIRED)
- **Field**: `greetingAudioUrl`
- **When Played**: During business hours when caller first connects
- **Example**: "Thank you for calling [Company Name]. An agent will be with you shortly."
- **Duration**: 5-10 seconds recommended

### 2. **Out-of-Hours Audio** (REQUIRED)
- **Field**: `outOfHoursAudioUrl`
- **When Played**: Outside business hours
- **Example**: "Thank you for calling [Company Name]. We are currently closed. Our business hours are Monday to Friday, 9 AM to 5 PM. Please call back during business hours."
- **Duration**: 10-15 seconds recommended

### 3. **Voicemail Prompt Audio** (OPTIONAL - Required if voicemail enabled)
- **Field**: `voicemailAudioUrl`
- **When Played**: Before recording voicemail (if `outOfHoursAction` = 'voicemail')
- **Example**: "Please leave your name, number, and a brief message after the beep."
- **Duration**: 5-7 seconds recommended

### 4. **Queue Audio** (OPTIONAL)
- **Field**: `queueAudioUrl`
- **When Played**: When no agents are available and call is queued
- **Example**: "All our agents are currently assisting other customers. Please hold and you will be connected shortly."
- **Duration**: 8-12 seconds recommended
- **Note**: If not configured, Twilio hold music will play

---

## 🗄️ Database Configuration

### SQL to Configure Your Inbound Number

```sql
UPDATE "inbound_numbers" 
SET 
  "greetingAudioUrl" = 'https://your-storage-url/greeting.mp3',
  "outOfHoursAudioUrl" = 'https://your-storage-url/out-of-hours.mp3',
  "voicemailAudioUrl" = 'https://your-storage-url/voicemail-prompt.mp3',
  "queueAudioUrl" = 'https://your-storage-url/queue-message.mp3',
  "businessHours" = '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
  "businessHoursStart" = '09:00',
  "businessHoursEnd" = '17:00',
  "timezone" = 'Europe/London',
  "outOfHoursAction" = 'hangup',  -- or 'voicemail' if you want voicemail
  "recordCalls" = true
WHERE "phoneNumber" = '+442046343130';
```

### Check Current Configuration

```sql
SELECT 
  "phoneNumber",
  "displayName",
  "greetingAudioUrl",
  "outOfHoursAudioUrl",
  "voicemailAudioUrl",
  "queueAudioUrl",
  "businessHoursStart",
  "businessHoursEnd",
  "businessHours",
  "outOfHoursAction",
  "isActive"
FROM "inbound_numbers"
WHERE "phoneNumber" = '+442046343130';
```

---

## 🎙️ Audio File Requirements

### Technical Specifications
- **Format**: MP3 (preferred) or WAV
- **Sample Rate**: 8kHz or 16kHz (phone quality)
- **Bitrate**: 32-64 kbps (lower is fine for voice)
- **Channels**: Mono (stereo will be converted)
- **Duration**: Keep messages concise (5-15 seconds)

### Storage Options
1. **AWS S3** (recommended for production)
   - Create public bucket or use signed URLs
   - Example: `https://s3.amazonaws.com/your-bucket/audio/greeting.mp3`

2. **Twilio Assets** (easiest for testing)
   - Upload via Twilio Console → Assets
   - Example: `https://example.twil.io/greeting.mp3`

3. **Your Own CDN/Server**
   - Must be publicly accessible via HTTPS
   - Must have proper CORS headers

---

## 🔄 Call Flow Behavior

### During Business Hours
```
Incoming Call
  → Play greetingAudioUrl
  → Ring available agents
  → If no answer within 30s:
    → Play queueAudioUrl (if configured)
    → Play hold music
    → Queue for next available agent
```

### Outside Business Hours
```
Incoming Call
  → Check business hours
  → Play outOfHoursAudioUrl
  → Hangup
  
  OR (if voicemail enabled):
  
Incoming Call
  → Check business hours
  → Play voicemailAudioUrl
  → Record voicemail
  → Hangup
```

---

## 🚨 What Happens If Audio Files Are Missing?

### ⚠️ NEW BEHAVIOR (TTS Disabled):

| Scenario | Old Behavior (TTS) | New Behavior (No TTS) |
|----------|-------------------|----------------------|
| Missing greetingAudioUrl | "Please hold..." (TTS) | **Silent hangup + error log** |
| Missing outOfHoursAudioUrl | "We are closed..." (TTS) | **Silent hangup + error log** |
| Missing voicemailAudioUrl | "Leave a message..." (TTS) | **Silent hangup + error log** |
| Missing queueAudioUrl | "Agents are busy..." (TTS) | Hold music plays (OK) |
| Inbound number not in DB | "Application error..." (TTS) | **Silent hangup + error log** |

### Error Logs to Watch For:
```
❌ CRITICAL: No greetingAudioUrl configured for inbound number
❌ CRITICAL: No outOfHoursAudioUrl configured for inbound number
❌ TTS is disabled. Audio files are REQUIRED. Please configure [field] in database.
```

---

## ✅ Testing Checklist

### Before Going Live:
- [ ] Upload all required audio files to accessible storage
- [ ] Update database with audio file URLs
- [ ] Configure business hours correctly
- [ ] Set timezone to match your location
- [ ] Test calling during business hours
- [ ] Test calling outside business hours
- [ ] Verify audio plays correctly (no silence)
- [ ] Check Railway logs for any error messages
- [ ] Confirm agent notifications appear in Omnivox UI

### Test Scenarios:
```bash
# 1. During business hours with agents available
# Expected: greeting audio → agent rings

# 2. During business hours with no agents available
# Expected: greeting audio → queue audio → hold music

# 3. Outside business hours (hangup mode)
# Expected: out-of-hours audio → hangup

# 4. Outside business hours (voicemail mode)
# Expected: voicemail prompt audio → record → hangup
```

---

## 🛠️ Quick Setup Script

Save this as `setup-inbound-audio.js` and run with Node:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupInboundAudio() {
  const phoneNumber = '+442046343130';
  
  const result = await prisma.inboundNumber.update({
    where: { phoneNumber },
    data: {
      greetingAudioUrl: 'https://your-storage.com/greeting.mp3',
      outOfHoursAudioUrl: 'https://your-storage.com/out-of-hours.mp3',
      voicemailAudioUrl: 'https://your-storage.com/voicemail.mp3',
      queueAudioUrl: 'https://your-storage.com/queue.mp3',
      businessHours: '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      timezone: 'Europe/London',
      outOfHoursAction: 'hangup',
      recordCalls: true,
      isActive: true
    }
  });
  
  console.log('✅ Inbound number configured:', result);
  await prisma.$disconnect();
}

setupInboundAudio().catch(console.error);
```

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for error messages
2. Verify audio file URLs are publicly accessible
3. Test audio files in browser (should download/play)
4. Ensure database fields are populated correctly
5. Confirm business hours match your timezone

---

## 🎯 Why This Change?

**Professional Enterprise Standard:**
- ❌ TTS sounds robotic and unprofessional
- ✅ Pre-recorded audio allows professional voice talent
- ✅ Custom branding and tone of voice
- ✅ Better caller experience
- ✅ Regulatory compliance (some industries require specific wording)
- ✅ Multi-language support (record in any language)
- ✅ Consistent quality every call

**Following Omnivox-AI Development Rules:**
> "Never Add Simulated or placeholder features."

TTS is a placeholder. Professional systems use audio files.
