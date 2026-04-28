# 🎙️ Quick Recording Checklist

Print this out or keep it next to you while recording!

---

## ✅ Before You Start

- [ ] Audacity installed and tested
- [ ] Microphone connected and working
- [ ] Quiet room (windows closed, fans off)
- [ ] Glass of water nearby
- [ ] Headphones on (to monitor)
- [ ] Read through all 14 scripts once

---

## 📝 Recording Session 1: British Voice (7 prompts)

**Voice:** Professional, warm, British accent

- [ ] **inbound-greeting.mp3**  
  _"Thank you for calling. Please hold while I connect you to an available agent."_

- [ ] **agents-busy.mp3**  
  _"All our agents are currently busy. Please call back later or leave a voicemail."_

- [ ] **transfer-initiating.mp3**  
  _"Transferring your call, please hold."_

- [ ] **transfer-failed.mp3**  
  _"The transfer was unsuccessful. Returning to original call."_

- [ ] **call-on-hold.mp3**  
  _"Your call is being placed on hold. Please wait for an available agent."_

- [ ] **voicemail-prompt.mp3**  
  _"Please leave your message after the beep. Press any key when finished."_

- [ ] **voicemail-thankyou.mp3**  
  _"Thank you for your message. Goodbye."_

---

## 📝 Recording Session 2: American Voice (7 prompts)

**Voice:** Friendly, clear, American accent

- [ ] **customer-connecting-outbound.mp3**  
  _"Please hold while we connect you to an agent."_

- [ ] **agents-unavailable.mp3**  
  _"Sorry, all agents are currently busy. Please try again later."_

- [ ] **agent-connecting-inbound.mp3**  
  _"Connecting you to the customer..."_

- [ ] **agent-connecting-conference.mp3**  
  _"Connecting you to the customer."_

- [ ] **agent-connected.mp3**  
  _"You are now connected."_

- [ ] **system-error.mp3**  
  _"We apologize, but we are experiencing technical difficulties. Please try again later."_

- [ ] **connection-failed.mp3**  
  _"Connection failed. Please try again."_

---

## ✂️ Editing Checklist (For Each File)

- [ ] Remove silence at start/end
- [ ] Apply noise reduction (if needed)
- [ ] Normalize to -1.0 dB
- [ ] Apply compressor effect
- [ ] Add fade in/out (0.1 seconds)
- [ ] Listen to entire file
- [ ] Export as MP3, Mono, 192kbps

---

## 💾 Export Checklist

- [ ] File → Export → Export Audio
- [ ] Format: **MP3 Files**
- [ ] Bit Rate: **192 kbps**
- [ ] Channel Mode: **Mono**
- [ ] Filename: **EXACTLY** as shown above (lowercase, hyphens)
- [ ] Save location: `audio-prompts/` folder

---

## 📤 Upload Checklist

- [ ] All 14 files exported
- [ ] Files named correctly (check `ls -la audio-prompts/`)
- [ ] Copy files to `backend/public/audio/`
- [ ] Git add, commit, push
- [ ] Wait 2 minutes for Railway deployment
- [ ] Run test script: `./test-audio-files.sh`
- [ ] All files show ✅ PASS

---

## 🎯 Quality Standards

**Listen for:**
- ✅ Clear voice (no muffling)
- ✅ No background noise
- ✅ No clicks or pops
- ✅ Natural pacing
- ✅ Professional tone
- ✅ Consistent volume

**If any issues:** Re-record that prompt!

---

## ⏱️ Time Estimate

- Setup: 15 min
- Session 1 (British): 30 min
- Session 2 (American): 30 min
- Editing: 45 min
- Export: 15 min
- Upload & Test: 15 min

**Total: 2.5 hours**

---

## 🆘 Quick Troubleshooting

**Too quiet?** → Increase input level, speak louder  
**Background noise?** → Close windows, use noise reduction  
**Sounds muffled?** → Move mic closer (6 inches)  
**Clipping/distortion?** → Reduce input level, re-record  
**File won't export?** → Check Audacity format settings

---

## 🎤 Recording Tips

**DO:**
- Smile while recording (makes voice warmer)
- Take breaks between prompts
- Drink water to avoid mouth clicks
- Record multiple takes, pick best
- Maintain consistent mic distance

**DON'T:**
- Rush through the script
- Record when tired/sick
- Forget to remove background noise
- Export as stereo (must be mono!)
- Skip the normalize step

---

## ✨ You've Got This!

Remember: Professional voiceover artists take multiple takes too. If a recording isn't perfect, just do it again. You have unlimited tries!

**Good luck with your recordings! 🎙️**
