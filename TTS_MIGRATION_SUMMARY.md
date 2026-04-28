# 🎙️ TTS to Audio Files Migration - Summary

**Date:** 28 April 2026  
**Status:** ✅ READY TO IMPLEMENT  
**Total TTS Instances Found:** 14  
**Estimated Savings:** $80/year + faster call connection

---

## 📋 Quick Summary

I've completed a comprehensive audit of all Twilio Text-to-Speech usage in the Omnivox system and created a complete migration plan.

### What I Found

**14 TTS instances across 3 files:**
- `backend/src/services/enhancedTwiMLService.ts` - 8 instances
- `backend/src/routes/inboundCallRoutes.ts` - 1 instance  
- `backend/src/routes/productionDialerRoutes.ts` - 5 instances

### What I Created

1. **✅ TTS_TO_AUDIO_MIGRATION_PLAN.md** - Complete migration plan with:
   - Detailed TTS inventory with line numbers
   - Cost analysis ($80/year savings)
   - Audio file specifications
   - Implementation steps (5-day timeline)
   - Testing checklist
   - Deployment guide

2. **✅ backend/src/services/audioService.ts** - Production-ready service with:
   - Centralized URL management
   - All 14 audio file constants
   - Helper methods (playWithFallback, playOrSay)
   - Health check functionality
   - Environment variable support

3. **✅ AUDIO_PROMPTS_SPECIFICATION.md** - Complete voice talent brief:
   - 14 prompts with exact text
   - Direction notes for each prompt
   - Technical requirements (MP3, mono, 16kHz+)
   - Quality checklist
   - Delivery requirements

---

## 🎯 Recommended Next Steps

### Step 1: Order Professional Recordings (Today)

**Option A: Fiverr (Recommended - Fast & Affordable)**
```
1. Go to: https://www.fiverr.com/search/gigs?query=british%20english%20voiceover
2. Search for "British English Female Voiceover" (£20-30)
3. Search for "American English Female Voiceover" (£20-30)
4. Send them AUDIO_PROMPTS_SPECIFICATION.md
5. Delivery: 48-72 hours
6. Total cost: £40-60
```

**Option B: AI Voice (Fast but subscription required)**
```
1. Go to: https://elevenlabs.io/
2. Sign up (£5-10/month for professional voices)
3. Generate all 14 prompts using British/American voices
4. Download MP3s immediately
5. Cancel subscription if not needed ongoing
```

### Step 2: Set Up Audio Hosting (30 minutes)

**Option A: Railway Public Folder (Easiest)**
```bash
# Create public audio directory
mkdir -p backend/public/audio

# Later: Copy received audio files here
cp received-audio/*.mp3 backend/public/audio/

# Add static file serving to backend/src/index.ts
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));
```

**Option B: AWS S3 (More scalable)**
```bash
# Create S3 bucket
aws s3 mb s3://omnivox-audio-prompts

# Set public access
aws s3api put-public-access-block --bucket omnivox-audio-prompts --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Later: Upload files
aws s3 sync ./audio-prompts/ s3://omnivox-audio-prompts/ --acl public-read

# Set environment variable
AUDIO_CDN_URL=https://omnivox-audio-prompts.s3.amazonaws.com
```

### Step 3: Implement Code Changes (2 hours)

I can help you implement these systematically. The changes follow this pattern:

**BEFORE (TTS):**
```typescript
twiml.say({
  voice: 'alice',
  language: 'en-GB'
}, 'Thank you for calling. Please hold while I connect you to an available agent.');
```

**AFTER (Audio File):**
```typescript
import AudioService from '../services/audioService';

twiml.play(AudioService.getUrl(AudioService.INBOUND_GREETING));
```

**Priority order:**
1. 🔴 HIGH PRIORITY (4 files) - Customer-facing, high frequency
2. 🟡 MEDIUM PRIORITY (5 files) - Internal operations
3. 🟢 LOW PRIORITY (4 files) - Error handlers

---

## 💡 Implementation Options

### Option 1: Phased Rollout (Recommended for safety)

**Week 1: High Priority Only**
- Replace 4 most-used prompts
- Test in production
- Monitor for any issues
- Roll back if needed

**Week 2: Medium Priority**
- Replace 5 operational prompts
- Continue monitoring

**Week 3: Low Priority**
- Replace remaining 4 error prompts
- Complete migration

### Option 2: Full Replacement (Faster but riskier)

**Day 1-2:** Order and receive audio files  
**Day 3:** Set up hosting and upload files  
**Day 4:** Replace all 14 TTS instances  
**Day 5:** Test and deploy  

---

## 🧪 Testing Checklist

Before deploying to production:

- [ ] All 14 audio files uploaded and publicly accessible
- [ ] AudioService.verifyAllFiles() returns success
- [ ] Test inbound call → greeting plays correctly
- [ ] Test outbound call → customer hears greeting
- [ ] Test agent unavailable → busy message plays
- [ ] Test call transfer → transfer prompts play
- [ ] Test voicemail → voicemail prompts play
- [ ] Test error scenarios → error messages play
- [ ] Audio quality is clear on phone calls
- [ ] Volume level is consistent
- [ ] No clipping or distortion

---

## 📊 Expected Impact

### Immediate Benefits

✅ **Cost Reduction:** $0 vs $0.04/minute for TTS  
✅ **Faster Calls:** No 500ms TTS synthesis delay  
✅ **Better Quality:** Professional voice every time  
✅ **Consistency:** Same message every call  

### Long-term Benefits

✅ **Easy Updates:** Just replace MP3, no code changes  
✅ **Brand Control:** Can use company-specific voices  
✅ **Multi-language:** Easy to add new language versions  
✅ **Compliance:** Recordings can be reviewed/approved beforehand  

---

## 🚀 Ready to Start?

I'm ready to help you implement this. Here's what I recommend:

1. **Right now:** Order the voice recordings from Fiverr (2-day delivery)
2. **While waiting:** Set up Railway public folder for audio hosting
3. **When files arrive:** I'll help you implement the code changes
4. **Then test:** We'll verify all call flows work correctly
5. **Finally deploy:** Push to production and monitor

Would you like me to:

A. **Start implementing the infrastructure** (AudioService is already created, just need to integrate)
B. **Show you example code changes** for the high-priority prompts
C. **Create a test endpoint** to verify audio files work before full deployment
D. **Help you order the voice recordings** (I can provide a Fiverr brief template)

Let me know which approach you prefer and I'll proceed! 🎯
