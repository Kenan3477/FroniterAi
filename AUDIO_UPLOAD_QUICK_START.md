# 🎯 Quick Start: Upload Your Audio Files

## 📍 Where to Go

```
1. Open browser: https://omnivox.vercel.app/admin
2. Login as admin
3. Click sidebar: "Admin" section
4. Click: "Channels"
5. You'll see channel types - click the green "Voice" box
6. Tabs will appear at top: Inbound Numbers | Ring Groups | Internal Numbers | Voice Nodes | Audio Files | Inbound Conferences
7. Click: "Audio Files" tab
```

## 🎙️ What You'll See

The Audio Files Manager interface with:

### Upload Section (Top)
```
┌─────────────────────────────────────────────────────┐
│ 🔊 Upload New Audio File                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Select Audio File (MP3 or WAV, max 10MB)           │
│ [ Choose File ]  No file selected                   │
│                                                      │
│ Display Name *                    File Type *       │
│ [___________________]             [Greeting    ▼]   │
│                                                      │
│ Description                                          │
│ [______________________________________]            │
│                                                      │
│ Tags (comma-separated)                              │
│ [______________________________________]            │
│                                                      │
│ [ 📤 Upload Audio File ]                            │
└─────────────────────────────────────────────────────┘
```

### File List (Below)
```
┌─────────────────────────────────────────────────────┐
│ 📄 Uploaded Audio Files (0)                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  No audio files uploaded yet                        │
│  Upload your first audio file to get started        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### After Uploading
```
┌─────────────────────────────────────────────────────┐
│ 📄 Uploaded Audio Files (1)                         │
├─────────────────────────────────────────────────────┤
│ ▶️ Welcome Greeting [greeting]                      │
│    welcome-greeting-1234567890.mp3                  │
│    2.3 MB  0:30  MP3                                │
│    Professional welcome message                      │
│    Tags: english, professional, female               │
│                                        📋 Copy  🗑️ Del │
└─────────────────────────────────────────────────────┘
```

## 📤 Upload Your 14 Files

For each of your recordings:

1. **Click "Choose File"**
2. **Select your MP3 file**
3. **Fill in details:**
   - Name: "Welcome Greeting" (or whatever makes sense)
   - Type: Choose from dropdown (Greeting, Hold Music, etc.)
   - Description: "British English welcome message" (optional)
   - Tags: "english, professional, british" (optional)
4. **Click "Upload Audio File"**
5. **Wait 2-3 seconds** - file appears in list
6. **Click 📋 icon** to copy URL
7. **Save URL** - you'll need it for configuration

## 🎯 Your 14 Files to Upload

### British English Voice (7 files)
1. inbound-greeting.mp3 → Type: Greeting
2. agents-busy.mp3 → Type: Announcement
3. transfer-initiating.mp3 → Type: Announcement
4. transfer-failed.mp3 → Type: Announcement
5. call-on-hold.mp3 → Type: Hold Music
6. voicemail-prompt.mp3 → Type: Voicemail
7. voicemail-thankyou.mp3 → Type: Voicemail

### American English Voice (7 files)
8. customer-connecting-outbound.mp3 → Type: Announcement
9. agents-unavailable.mp3 → Type: Announcement
10. agent-connecting-inbound.mp3 → Type: Announcement
11. agent-connecting-conference.mp3 → Type: Announcement
12. agent-connected.mp3 → Type: Announcement
13. system-error.mp3 → Type: Announcement
14. connection-failed.mp3 → Type: Announcement

## 📋 After Uploading

You'll have 14 URLs like:
```
https://froniterai-production.up.railway.app/audio/inbound-greeting-1735401234567-abc123.mp3
https://froniterai-production.up.railway.app/audio/agents-busy-1735401234890-def456.mp3
...etc
```

## ✅ What to Do Next

Once all 14 files are uploaded:

1. **Tell me**: "All 14 files are uploaded"
2. **I'll help you**: Replace all TTS code with these audio URLs
3. **We'll test**: Make calls to verify everything works
4. **You'll save**: $80/year on Twilio TTS costs!

## 🆘 Troubleshooting

### "I don't see the Audio Files tab"
- Make sure you're logged in as admin
- Click on the "Voice" channel type (green phone icon)
- Tabs appear at the top, scroll right if needed

### "Upload button is disabled"
- Fill in the "Display Name" field (required)
- Select a "File Type" from dropdown (required)
- Make sure file is selected

### "Upload failed"
- Check file size (must be under 10MB)
- Check file format (only MP3 and WAV work)
- Try refreshing the page and logging in again

### "I uploaded but don't see the file"
- Click the refresh button on the page
- Check your internet connection
- Wait 5-10 seconds and refresh browser

## 🎉 You're Ready!

The system is live and waiting for your audio files. No more "coming soon" - it's fully functional!

Navigate to: **Admin → Channels → Voice → Audio Files** and start uploading! 🚀
