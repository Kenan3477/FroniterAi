# 🎙️ DIY Audio Recording Guide for Omnivox Prompts

**Date:** 28 April 2026  
**Total Prompts:** 14 audio files  
**Estimated Time:** 2-3 hours (including setup and editing)  
**Cost:** £0 (using free software)

---

## 🎯 Quick Start Checklist

- [ ] **Equipment Ready:** Microphone, quiet room, headphones
- [ ] **Software Installed:** Audacity (free)
- [ ] **Test Recording:** Make a 5-second test to check quality
- [ ] **Record All 14 Prompts:** Follow script below
- [ ] **Edit & Export:** Normalize, remove silence, export as MP3
- [ ] **Upload to Railway:** Place in `backend/public/audio/`

---

## 🛠️ Equipment You'll Need

### Minimum Requirements (You probably have these)

✅ **Microphone Options:**
- **Built-in laptop mic:** Acceptable for internal use, not ideal for customers
- **Smartphone headphone mic:** Better than laptop mic
- **USB microphone:** Best quality (Blue Yeti, Audio-Technica ATR2100, ~£50-100)
- **Gaming headset:** Surprisingly good quality

✅ **Recording Environment:**
- **Quiet room:** Close windows, turn off fans/AC
- **Soft surfaces:** Bedroom/living room better than kitchen/bathroom
- **Avoid echo:** Record away from walls, use blankets/pillows to dampen

✅ **Headphones:** To monitor your recording (prevent feedback)

---

## 💻 Software Setup (Free)

### Install Audacity (Best Free Audio Editor)

**macOS:**
```bash
# Install via Homebrew
brew install --cask audacity

# Or download from website
open https://www.audacityteam.org/download/mac/
```

**Alternative: GarageBand (Already on Mac)**
- Already installed on macOS
- Very user-friendly
- Professional quality
- Built-in compression/EQ

---

## 🎙️ Recording Setup in Audacity

### 1. Configure Audacity

1. **Open Audacity**
2. **Set Input Device:** 
   - Top toolbar → Click microphone icon
   - Select your microphone
3. **Set Recording Settings:**
   - Sample Rate: **48000 Hz** (bottom left)
   - Channels: **1 (Mono)** - Important!
4. **Test Levels:**
   - Speak normally
   - Waveform should peak around -12dB to -6dB
   - Adjust input slider if too quiet/loud

### 2. Recording Technique

**Before You Start:**
```
✅ Sit comfortably, back straight
✅ Microphone 6-8 inches from mouth
✅ Slightly off-axis (not directly in front) to reduce plosives
✅ Take a deep breath, smile (makes voice warmer)
✅ Read prompt 2-3 times to practice pace
```

**While Recording:**
```
✅ Speak clearly but naturally (not robotic)
✅ Maintain consistent distance from mic
✅ Pause for 1 second before and after each prompt
✅ If you make a mistake, pause 2 seconds and re-do the line
✅ Record 2-3 takes of each prompt (choose best later)
```

**After Each Prompt:**
```
✅ Listen back with headphones
✅ Check for: clarity, pacing, mouth clicks, background noise
✅ Re-record if needed
```

---

## 📝 Recording Script

### Recording Session 1: British English Voice (7 prompts)

**Your Voice Character:**
- Professional, warm, reassuring
- British accent (or neutral/professional tone if not British)
- Medium pace, clear enunciation
- Slight smile in voice

**Record these:**

```
PROMPT 1: inbound-greeting
"Thank you for calling. Please hold while I connect you to an available agent."
[Pause 1 second before starting]
[Pause 1 second after finishing]

PROMPT 2: agents-busy
"All our agents are currently busy. Please call back later or leave a voicemail."
[Empathetic, not frustrated]

PROMPT 3: transfer-initiating
"Transferring your call, please hold."
[Calm, informative]

PROMPT 4: transfer-failed
"The transfer was unsuccessful. Returning to original call."
[Professional, matter-of-fact]

PROMPT 5: call-on-hold
"Your call is being placed on hold. Please wait for an available agent."
[Reassuring, patient]

PROMPT 6: voicemail-prompt
"Please leave your message after the beep. Press any key when finished."
[Instructive but friendly]

PROMPT 7: voicemail-thankyou
"Thank you for your message. Goodbye."
[Warm, appreciative]
```

---

### Recording Session 2: American English Voice (7 prompts)

**Your Voice Character:**
- Friendly, clear, confident
- American/neutral accent (or professional tone)
- Medium pace, conversational
- Upbeat but professional

**Record these:**

```
PROMPT 8: customer-connecting-outbound
"Please hold while we connect you to an agent."
[Friendly, reassuring]

PROMPT 9: agents-unavailable
"Sorry, all agents are currently busy. Please try again later."
[Genuinely apologetic]

PROMPT 10: agent-connecting-inbound
"Connecting you to the customer..."
[Professional, brief]

PROMPT 11: agent-connecting-conference
"Connecting you to the customer."
[Matter-of-fact, confident]

PROMPT 12: agent-connected
"You are now connected."
[Confirmatory, brief]

PROMPT 13: system-error
"We apologize, but we are experiencing technical difficulties. Please try again later."
[Apologetic but calm]

PROMPT 14: connection-failed
"Connection failed. Please try again."
[Brief, matter-of-fact]
```

---

## ✂️ Editing in Audacity

### For Each Recorded Prompt:

**1. Select the Best Take**
```
- Listen to all takes
- Choose the clearest, most natural sounding one
- Delete the other takes
```

**2. Remove Silence**
```
- Select the audio
- Effect → Truncate Silence
  - Detect silence: -40 dB
  - Duration: 0.3 seconds
  - Truncate to: 0.1 seconds
- Click OK
```

**3. Reduce Noise (if needed)**
```
- Find a section with ONLY background noise (no voice)
- Select it
- Effect → Noise Reduction
- Click "Get Noise Profile"
- Select ALL audio (Ctrl+A / Cmd+A)
- Effect → Noise Reduction again
  - Noise reduction: 12 dB (don't overdo it!)
  - Click OK
```

**4. Normalize Volume**
```
- Select all audio (Ctrl+A / Cmd+A)
- Effect → Normalize
  - Normalize peak amplitude: -1.0 dB
  - ✅ Check "Remove DC offset"
  - Click OK
```

**5. Compress Dynamics (Optional but Recommended)**
```
- Select all audio
- Effect → Compressor
  - Threshold: -12 dB
  - Noise Floor: -40 dB
  - Ratio: 3:1
  - Attack: 0.2 seconds
  - Release: 1.0 seconds
  - ✅ Make-up gain
  - Click OK
```

**6. Fade In/Out (Polish)**
```
- Select first 0.1 seconds
- Effect → Fade In
- Select last 0.1 seconds
- Effect → Fade Out
```

**7. Final Check**
```
✅ Listen to entire file
✅ Check waveform isn't clipping (touching top/bottom)
✅ Sounds clear and professional
✅ No clicks, pops, or background noise
```

---

## 💾 Export Settings

### Export Each Prompt as MP3

**For Each File:**
```
1. File → Export → Export Audio...
2. Save in folder: "audio-prompts"
3. Filename: EXACTLY as specified (e.g., "inbound-greeting.mp3")
4. Format: MP3 Files
5. Bit Rate Mode: Constant
6. Quality: 192 kbps (or 128 kbps minimum)
7. Channel Mode: Mono
8. Click "Save"
9. Metadata: Leave blank or fill Artist/Title, click OK
```

**File Naming (CRITICAL - Must be exact):**
```
✅ inbound-greeting.mp3
✅ agents-busy.mp3
✅ transfer-initiating.mp3
✅ transfer-failed.mp3
✅ call-on-hold.mp3
✅ voicemail-prompt.mp3
✅ voicemail-thankyou.mp3
✅ customer-connecting-outbound.mp3
✅ agents-unavailable.mp3
✅ agent-connecting-inbound.mp3
✅ agent-connecting-conference.mp3
✅ agent-connected.mp3
✅ system-error.mp3
✅ connection-failed.mp3
```

---

## 🧪 Quality Check

### Test Each File

**In Terminal:**
```bash
# Check file format
ffprobe -i audio-prompts/inbound-greeting.mp3 -hide_banner 2>&1 | grep Audio

# Should show: Audio: mp3, 48000 Hz, mono, fltp, 192 kb/s

# Check duration
ffprobe -i audio-prompts/inbound-greeting.mp3 -show_entries format=duration -v quiet -of csv="p=0"

# Play file to verify
afplay audio-prompts/inbound-greeting.mp3
```

**Listen for:**
```
✅ Clear voice (no muffling)
✅ No background noise
✅ No clicks, pops, or breaths
✅ Consistent volume
✅ Natural pacing (not rushed)
✅ Professional tone
```

---

## 📤 Upload to Railway

### Option 1: Railway Public Folder (Recommended)

```bash
# Create directory structure
mkdir -p backend/public/audio

# Copy your recorded files
cp audio-prompts/*.mp3 backend/public/audio/

# Verify files are there
ls -lh backend/public/audio/

# Add to git (these are small files, safe to commit)
git add backend/public/audio/*.mp3

# Commit
git commit -m "Add pre-recorded audio prompts to replace TTS

- 14 professional audio files for all call flows
- British English voice (7 prompts)
- American English voice (7 prompts)
- Reduces Twilio TTS costs to \$0
- Improves call connection speed (no synthesis delay)"

# Push to Railway
git push
```

### Option 2: Alternative - AWS S3

```bash
# Create S3 bucket
aws s3 mb s3://omnivox-audio-prompts

# Upload files
aws s3 sync audio-prompts/ s3://omnivox-audio-prompts/ --acl public-read

# Set environment variable in Railway
# AUDIO_CDN_URL=https://omnivox-audio-prompts.s3.amazonaws.com
```

---

## 🔧 Configure Backend

### Add Static File Serving

**File: `backend/src/index.ts`**

Add this line with your other middleware:

```typescript
import express from 'express';
import path from 'path';

const app = express();

// ... other middleware ...

// Serve static audio files
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));

// ... rest of your routes ...
```

### Set Environment Variable

**In Railway Dashboard:**
```
Variable: AUDIO_CDN_URL
Value: https://froniterai-production.up.railway.app/audio
```

Or it will auto-detect from `BACKEND_URL` if not set.

---

## 📊 Recording Tips for Best Quality

### Reduce Plosives (P, T, K sounds)

**Problem:** "Please" causes a pop in the mic  
**Solution:** 
- Position mic slightly to the side (not directly in front)
- Use a pop filter (or makeshift: pantyhose over coat hanger)
- Reduce emphasis on P, T, K sounds

### Reduce Mouth Clicks

**Problem:** Saliva clicks between words  
**Solution:**
- Drink water before recording
- Avoid dairy products before recording
- Edit out clicks in Audacity (zoom in, select, delete)

### Consistent Volume

**Problem:** Some words louder than others  
**Solution:**
- Maintain same distance from mic
- Use compressor effect in Audacity
- Re-record if variation is too much

### Natural Pacing

**Problem:** Sounding rushed or robotic  
**Solution:**
- Read prompt 3-4 times before recording
- Imagine you're speaking to a real person
- Smile slightly (makes voice warmer)
- Don't be afraid to pause naturally

---

## ⏱️ Estimated Timeline

```
Setup & Testing           : 30 minutes
Recording Session 1 (UK)  : 30 minutes
Recording Session 2 (US)  : 30 minutes
Editing All Files         : 45 minutes
Export & Quality Check    : 15 minutes
Upload to Railway         : 10 minutes
------------------------------------------
TOTAL                     : 2.5-3 hours
```

**Pro Tip:** Take breaks between sessions to rest your voice!

---

## 🎯 Next Steps After Recording

Once you have all 14 MP3 files:

1. **Upload to Railway:** (git add/commit/push)
2. **Verify URLs work:**
   ```bash
   curl -I https://froniterai-production.up.railway.app/audio/inbound-greeting.mp3
   # Should return: HTTP/1.1 200 OK
   ```
3. **I'll help you implement the code changes** to replace TTS
4. **Test each call flow** to ensure audio plays correctly
5. **Deploy and monitor** - TTS costs should drop to $0!

---

## 🚨 Common Issues & Solutions

### Issue: Recording sounds muffled
**Solution:** 
- Move mic closer (6 inches away)
- Check mic isn't covered/obstructed
- Increase recording level in Audacity

### Issue: Too much background noise
**Solution:**
- Close windows
- Turn off fans/AC
- Record at quieter time of day
- Use noise reduction in Audacity

### Issue: Voice sounds too quiet
**Solution:**
- Speak louder (but naturally)
- Increase recording level
- Use Normalize effect in Audacity

### Issue: Audio clips/distorts
**Solution:**
- Reduce recording level (waveform shouldn't touch top/bottom)
- Re-record the affected prompts

### Issue: File format wrong
**Solution:**
- Re-export in Audacity: File → Export → MP3
- Set to Mono, 192kbps

---

## 📚 Resources

**Audacity Tutorials:**
- Official Guide: https://manual.audacityteam.org/
- Vocal Recording: https://www.youtube.com/watch?v=NL3sS4qF4oc
- Noise Reduction: https://www.youtube.com/watch?v=10FFKl_0x7E

**GarageBand (Mac Alternative):**
- Apple's Guide: https://support.apple.com/guide/garageband/
- Very user-friendly, great for beginners

---

**Ready to start recording?** 

Let me know when you've finished recording and uploaded the files - I'll help you implement the code changes to replace all the TTS calls! 🎙️
