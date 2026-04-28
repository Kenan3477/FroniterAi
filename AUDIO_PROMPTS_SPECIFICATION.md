# Audio Prompts Specification

**Project:** Omnivox AI Dialler  
**Date:** 28 April 2026  
**Voice Requirements:** Professional, Clear, Warm

---

## Recording Instructions for Voice Talent

### General Requirements

- **Format:** MP3, 128kbps minimum (192kbps preferred)
- **Sample Rate:** 16kHz minimum (44.1kHz or 48kHz preferred)
- **Channels:** Mono (single channel)
- **Duration:** As natural (don't rush, don't drag)
- **Tone:** Professional but friendly, not robotic
- **Background:** Completely silent, studio quality
- **Editing:** Remove all breaths, clicks, pops
- **Normalization:** Peak at -3dB to -1dB
- **File Naming:** Exactly as specified below (lowercase, hyphens)

---

## Voice Talent 1: British English Female

**Characteristics:**
- Accent: Standard British English (RP/BBC English)
- Age: 30-45 (mature but not elderly)
- Tone: Professional, warm, reassuring
- Pace: Medium (not rushed, clear enunciation)

### Prompts for British Voice

#### 1. inbound-greeting.mp3
**Text:**  
"Thank you for calling. Please hold while I connect you to an available agent."

**Direction:**
- Warm and welcoming
- Slight smile in voice
- Emphasize "Thank you"
- Pause after "calling" (0.3s)
- Pause after "hold" (0.2s)
- Natural, reassuring tone

**Expected Duration:** ~5 seconds

---

#### 2. agents-busy.mp3
**Text:**  
"All our agents are currently busy. Please call back later or leave a voicemail."

**Direction:**
- Empathetic, apologetic tone
- NOT frustrated or annoyed
- Pause after "busy" (0.3s)
- Pause after "later" (0.2s)
- Warm on "or leave a voicemail"

**Expected Duration:** ~6 seconds

---

#### 3. transfer-initiating.mp3
**Text:**  
"Transferring your call, please hold."

**Direction:**
- Calm, informative
- Not rushed
- Pause after "call" (0.2s)
- Reassuring tone

**Expected Duration:** ~3 seconds

---

#### 4. transfer-failed.mp3
**Text:**  
"The transfer was unsuccessful. Returning to original call."

**Direction:**
- Professional, informative
- NOT apologetic or frustrated
- Matter-of-fact delivery
- Pause after "unsuccessful" (0.3s)
- Clear enunciation

**Expected Duration:** ~4 seconds

---

#### 5. call-on-hold.mp3
**Text:**  
"Your call is being placed on hold. Please wait for an available agent."

**Direction:**
- Reassuring, patient tone
- Pause after "hold" (0.3s)
- Warm on "Please wait"
- Professional throughout

**Expected Duration:** ~5 seconds

---

#### 6. voicemail-prompt.mp3
**Text:**  
"Please leave your message after the beep. Press any key when finished."

**Direction:**
- Instructive but friendly
- Clear enunciation on "after the beep"
- Pause after "beep" (0.3s)
- Slightly slower pace for clarity

**Expected Duration:** ~5 seconds

---

#### 7. voicemail-thankyou.mp3
**Text:**  
"Thank you for your message. Goodbye."

**Direction:**
- Warm, appreciative
- Slight smile in voice
- Pause after "message" (0.2s)
- Friendly but professional "Goodbye"

**Expected Duration:** ~2 seconds

---

## Voice Talent 2: American English Female

**Characteristics:**
- Accent: General American (neutral, no strong regional accent)
- Age: 30-45 (professional but approachable)
- Tone: Friendly, clear, confident
- Pace: Medium (conversational but professional)

### Prompts for American Voice

#### 8. customer-connecting-outbound.mp3
**Text:**  
"Please hold while we connect you to an agent."

**Direction:**
- Friendly, reassuring
- Pause after "hold" (0.2s)
- Warm on "connect you"
- Not robotic

**Expected Duration:** ~4 seconds

---

#### 9. agents-unavailable.mp3
**Text:**  
"Sorry, all agents are currently busy. Please try again later."

**Direction:**
- Genuinely apologetic
- NOT dismissive
- Pause after "busy" (0.3s)
- Warm, understanding tone
- Clear on "try again later"

**Expected Duration:** ~5 seconds

---

#### 10. agent-connecting-inbound.mp3
**Text:**  
"Connecting you to the customer..."

**Direction:**
- Professional, brief
- Slight upward inflection (anticipatory)
- Let "customer" trail slightly
- Confident tone

**Expected Duration:** ~2 seconds

---

#### 11. agent-connecting-conference.mp3
**Text:**  
"Connecting you to the customer."

**Direction:**
- Professional, matter-of-fact
- Clear statement (not a question)
- Brief and efficient
- Confident delivery

**Expected Duration:** ~2 seconds

---

#### 12. agent-connected.mp3
**Text:**  
"You are now connected."

**Direction:**
- Confirmatory, professional
- Brief and clear
- Slight emphasis on "now"
- Confident closure

**Expected Duration:** ~2 seconds

---

#### 13. system-error.mp3
**Text:**  
"We apologize, but we are experiencing technical difficulties. Please try again later."

**Direction:**
- Apologetic but calm
- NOT panicked or frustrated
- Professional throughout
- Pause after "apologize" (0.2s)
- Pause after "difficulties" (0.3s)
- Clear on "try again later"

**Expected Duration:** ~6 seconds

---

#### 14. connection-failed.mp3
**Text:**  
"Connection failed. Please try again."

**Direction:**
- Brief, matter-of-fact
- NOT frustrated
- Pause after "failed" (0.2s)
- Clear, simple instruction

**Expected Duration:** ~2 seconds

---

## Delivery Format

### File Structure
```
audio-prompts/
├── inbound-greeting.mp3
├── agents-busy.mp3
├── transfer-initiating.mp3
├── transfer-failed.mp3
├── call-on-hold.mp3
├── voicemail-prompt.mp3
├── voicemail-thankyou.mp3
├── customer-connecting-outbound.mp3
├── agents-unavailable.mp3
├── agent-connecting-inbound.mp3
├── agent-connecting-conference.mp3
├── agent-connected.mp3
├── system-error.mp3
└── connection-failed.mp3
```

### Quality Checklist

Before delivering, verify each file:
- [ ] Correct filename (lowercase, hyphens)
- [ ] MP3 format, 128kbps+ bitrate
- [ ] Mono channel (not stereo)
- [ ] No background noise
- [ ] No mouth clicks or breaths
- [ ] Consistent volume across all files
- [ ] Normalized to -3dB to -1dB peak
- [ ] Clean beginning and end (no pops or cuts)
- [ ] Natural pacing (not rushed)
- [ ] Clear enunciation

---

## Testing Script

After receiving files, test each one:

```bash
# Check file format
ffmpeg -i inbound-greeting.mp3 -hide_banner

# Expected output:
# Stream #0:0: Audio: mp3, 44100 Hz, mono, fltp, 192 kb/s

# Check duration
ffprobe -i inbound-greeting.mp3 -show_entries format=duration -v quiet -of csv="p=0"

# Play file
afplay inbound-greeting.mp3  # macOS
# or
mpg123 inbound-greeting.mp3  # Linux
```

---

## Acceptance Criteria

All files must meet:
1. ✅ **Audio Quality:** Clear, professional, no background noise
2. ✅ **Correct Text:** Exactly as specified (no ad-libs)
3. ✅ **Appropriate Tone:** Matches direction for each prompt
4. ✅ **Technical Specs:** MP3, mono, 16kHz+, normalized
5. ✅ **File Naming:** Exact match (case-sensitive)
6. ✅ **Duration:** Within ±1 second of expected
7. ✅ **Consistency:** Similar volume/quality across all files
8. ✅ **No Artifacts:** No clicks, pops, or digital distortion

---

## Revision Policy

- Up to 2 rounds of revisions included
- Revisions only for technical quality issues or incorrect text
- Not for "I want a different voice" or subjective preferences
- Turnaround: 24 hours for revisions

---

## Usage Rights

By delivering these files, voice talent grants:
- Unlimited commercial use
- Perpetual license
- Worldwide distribution rights
- Right to modify/edit files
- No attribution required
- Exclusive use (no reselling same recordings)

---

## Payment Terms

- Payment upon acceptance of all 14 files
- Acceptance based on criteria above
- Files delivered via Google Drive, Dropbox, or WeTransfer
- Expected delivery: 48-72 hours after project start

---

**Questions?** Contact: [Your Email]  
**Budget:** £40-60 for all 14 prompts (£2.85-4.28 per prompt)
