# 📤 Quick Guide: Uploading Audio Files to Replace TTS

## ✅ What's Been Done
All Twilio TTS (Text-to-Speech) has been removed from your system. The code now expects audio files instead of generating speech from text.

---

## 🎯 What You Need to Do

### Step 1: Create/Get Your Audio Files

You need audio files for these scenarios:

#### HIGH PRIORITY (Must Have):
1. **Greeting Audio** - "Thank you for calling [Your Company]. Please hold while we connect you to an available agent."
2. **Voicemail Prompt** - "Please leave your message after the beep. Press pound when finished."
3. **Out of Hours Audio** - "Thank you for calling [Your Company]. Our office hours are Monday to Friday, 9 AM to 5 PM. Please call back during business hours or leave a message."

#### MEDIUM PRIORITY (Highly Recommended):
4. **Busy Audio** - "All our agents are currently busy assisting other customers. Please call back later or leave a voicemail."
5. **Voicemail Thank You** - "Thank you for your message. We'll get back to you as soon as possible. Goodbye."
6. **Hold Audio** - "Your call is being placed on hold. Please wait for an available agent."

#### LOW PRIORITY (Optional):
7. **Queue Music** - Custom hold music (otherwise uses default Twilio music)
8. **Transfer Audio** - "Transferring your call, please hold."
9. **Transfer Failed** - "The transfer was unsuccessful. Returning you to your original call."
10. **No Answer** - "I'm sorry, there's no answer. Please try again later."

---

## 🎙️ Creating Audio Files

### Option A: Record Yourself (FREE)

**Using a Computer:**
1. Open Audacity (free software)
2. Click red record button
3. Read your script clearly
4. Export as MP3 (File → Export → MP3)

**Using a Phone:**
1. Open Voice Memos (iOS) or Voice Recorder (Android)
2. Record your message
3. Share/export as MP3

**Tips for Good Audio:**
- Quiet room (no background noise)
- Speak clearly and professionally
- Smile while recording (sounds friendlier!)
- Re-record if you make a mistake

### Option B: Hire a Voice Actor ($50-200)

**Websites:**
- **Fiverr** - $20-100 per script
- **Upwork** - $30-150 per script
- **Voices.com** - Professional, $100-300

**What to provide:**
- All your scripts (from above)
- Preferred gender/accent
- Tone (professional, friendly, etc.)

### Option C: AI Voice Generation ($10-30)

**Recommended Services:**
- **ElevenLabs** - Very natural, $10/month
- **Play.ht** - Good quality, $15/month
- **Murf.ai** - Professional, $20/month

**Process:**
1. Sign up for account
2. Paste your script
3. Choose voice (British/American, Male/Female)
4. Generate audio
5. Download MP3

---

## 📋 Audio File Requirements

### Technical Specs:
- **Format:** MP3 or WAV
- **Sample Rate:** 8kHz or 16kHz (phone quality)
- **Bitrate:** 64 kbps minimum
- **Mono or Stereo:** Either works (mono preferred)
- **Max File Size:** 5 MB per file

### File Naming (Suggested):
- `greeting.mp3`
- `voicemail-prompt.mp3`
- `out-of-hours.mp3`
- `busy.mp3`
- `voicemail-thankyou.mp3`
- `hold.mp3`
- `queue-music.mp3`
- `transfer.mp3`
- `transfer-failed.mp3`
- `no-answer.mp3`

---

## 🌐 Hosting Your Audio Files

### Option A: Upload to Your System (RECOMMENDED)
**Where:** Your Omnivox admin panel → Inbound Numbers → Configure
**How:**
1. Select your inbound number (e.g., +442046343130)
2. Click "Edit" or "Configure"
3. Find "Audio Files" section
4. Upload each audio file
5. Save

**Benefits:**
- Easiest option
- Files automatically hosted
- No external dependencies

### Option B: Host on AWS S3 (For Advanced Users)
1. Create S3 bucket (e.g., "omnivox-audio-files")
2. Upload your MP3 files
3. Make files publicly accessible
4. Copy the public URL
5. Paste URL into Omnivox configuration

**Example URL:** `https://omnivox-audio-files.s3.amazonaws.com/greeting.mp3`

### Option C: Use Your Own CDN
- Upload to your existing CDN
- Make sure files are publicly accessible
- Use HTTPS URLs (required by Twilio)

---

## ⚙️ Configuration in Omnivox

### Step 1: Go to Inbound Numbers
**Path:** Admin Panel → Voice → Inbound Numbers

### Step 2: Edit Your Number
Click on +442046343130 (or your inbound number)

### Step 3: Upload Audio Files

You'll see fields like:
- **Greeting Audio URL**
- **Voicemail Audio URL**
- **Out of Hours Audio URL**
- **Busy Audio URL**
- **Hold Audio URL**
- etc.

**For each field:**
1. Upload your MP3 file, OR
2. Paste the URL to your hosted audio file
3. Click "Test" button to preview (if available)
4. Save configuration

### Step 4: Test!
1. Call your inbound number: +442046343130
2. Listen - does your greeting play?
3. Wait for voicemail - does your voicemail prompt play?
4. Call outside business hours - does out-of-hours message play?

---

## 🧪 Testing Checklist

### Basic Tests:
- [ ] Call during business hours → Greeting plays
- [ ] Call during business hours, no agents → Busy message plays
- [ ] Call outside business hours → Out-of-hours message plays
- [ ] Trigger voicemail → Voicemail prompt plays
- [ ] Leave voicemail → Thank you message plays

### Advanced Tests:
- [ ] Get put on hold → Hold message plays, then queue music
- [ ] Transfer call → Transfer message plays
- [ ] Failed transfer → Transfer failed message plays

### Error Tests:
- [ ] Missing audio file → Call hangs up silently (no TTS)
- [ ] Invalid URL → Call continues without audio (no TTS)

---

## 🚨 Troubleshooting

### Problem: "Audio file not playing"
**Check:**
1. Is the URL publicly accessible? (Try opening in browser)
2. Is it HTTPS (not HTTP)?
3. Is the file format MP3 or WAV?
4. Is the file size under 5 MB?

**Fix:**
- Re-upload file
- Check Railway logs for errors
- Verify URL in Omnivox configuration

### Problem: "Call hangs up immediately"
**Cause:** No greeting audio configured
**Fix:** Upload greeting audio file (required)

### Problem: "Can't leave voicemail"
**Cause:** No voicemail prompt audio configured
**Fix:** Upload voicemail prompt audio file (required for voicemail)

### Problem: "Hear nothing on hold"
**Cause:** No hold/queue audio configured
**Fix:** Upload hold audio or queue music (optional, will use default Twilio music)

---

## 💰 Cost Comparison

### Before (With TTS):
- **TTS Cost:** $0.04 per minute
- **Average call:** 3 minutes = $0.12
- **100 calls/day:** $12/day = $360/month
- **1000 calls/day:** $120/day = $3,600/month

### After (With Audio Files):
- **Audio Playback:** $0.00 (free!)
- **Average call:** 3 minutes = $0.00
- **100 calls/day:** $0/day = $0/month
- **1000 calls/day:** $0/day = $0/month

**Monthly Savings:** $360 - $3,600+ 🎉

---

## 📊 What Happens Next

### Immediate (After Upload):
1. ✅ Your audio files play instead of robot voice
2. ✅ Professional branded experience
3. ✅ Zero TTS charges

### Within 24 Hours:
- Monitor Twilio bill - TTS charges should drop to $0
- Check Railway logs - should see "🎵 Playing [audio type] audio: [URL]"
- Verify call quality with test calls

### Ongoing:
- Update audio files anytime (just re-upload)
- Add new prompts as needed
- No code changes required!

---

## 🎯 Success Criteria

You'll know it's working when:
- ✅ You hear YOUR audio on calls (not robot voice)
- ✅ Twilio TTS charges = $0.00
- ✅ Railway logs show audio file playback
- ✅ No errors in call flow
- ✅ Customers compliment professional audio quality

---

## 🆘 Need Help?

### Check Railway Logs:
```
Look for:
🎵 Playing greeting audio: https://...
✅ Audio file playback successful

Warnings:
❌ No greeting audio configured
❌ Cannot take voicemail without audio
```

### Verify Configuration:
```bash
node test-inbound-config.js
```
This shows which audio files are configured and which are missing.

---

## 📝 Sample Scripts

### Greeting Audio Script:
> "Thank you for calling [Your Company Name]. Please hold while we connect you to an available agent."

### Voicemail Prompt Script:
> "Thank you for calling [Your Company Name]. We're unable to take your call right now. Please leave your name, number, and a brief message after the beep, and we'll get back to you as soon as possible. Press pound when finished."

### Out of Hours Script:
> "Thank you for calling [Your Company Name]. Our office hours are Monday through Friday, 9 AM to 5 PM. We're currently closed. Please call back during business hours, or leave a message and we'll return your call on the next business day."

### Busy Script:
> "All our agents are currently assisting other customers. Your call is important to us. Please call back in a few minutes, or stay on the line to leave a voicemail."

### Hold Script:
> "Your call is being placed on hold. An agent will be with you shortly. Thank you for your patience."

---

**Remember:** You only NEED the top 3 (greeting, voicemail, out-of-hours). The rest improve the experience but aren't required!

**Status:** Ready for you to upload audio files! 🎙️
