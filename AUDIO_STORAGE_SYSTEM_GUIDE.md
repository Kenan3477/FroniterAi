# 🎵 Complete Audio Storage System - User Guide

## ✅ **FULLY IMPLEMENTED: Backend Audio Storage**

Your audio files are now stored **directly in the Omnivox backend database** - no external storage needed!

---

## 🎯 **How It Works**

### **1. Storage Location**
- Audio files stored as **binary data (BYTEA)** in PostgreSQL
- Table: `audio_files`
- No S3, no Twilio Assets, no external CDN needed
- Files accessible via backend API endpoints

### **2. Upload Process**
```
Browser → FormData → /api/audio/upload → PostgreSQL → Success
```

### **3. Playback Process**
```
Click Play → /api/audio/stream/:id → Stream from database → Audio plays
```

---

## 📤 **How to Upload Audio Files**

### **Step 1: Navigate to Channels**
1. Go to **Admin** section
2. Click **Channels** in the sidebar
3. Select **Voice** channel
4. Click **Audio Files** tab

### **Step 2: Upload Files**
1. Click **"Upload Files"** button
2. Select audio file(s) from your computer
   - Supported: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
   - Max size: 10MB per file
3. Files are automatically uploaded to backend
4. Duration is detected automatically
5. Files appear in the list immediately

### **Step 3: Configure Usage**
After upload, use the audio file in:
- **Inbound Numbers** → Business hours settings → Select audio for greeting
- **Inbound Numbers** → Out of hours → Select audio for after-hours message
- **Inbound Numbers** → Voicemail → Select audio for voicemail prompt

---

## 🎵 **How to Play Audio Files**

### **In the Channels > Audio Files Tab:**
1. Find the audio file you want to test
2. Click the **▶️ Play** button
3. Audio streams from backend and plays immediately
4. Click **⏸️ Pause** to stop

### **What Happens:**
- Frontend requests: `GET /api/audio/stream/{file-id}`
- Backend streams binary data from database
- Browser HTML5 Audio element plays the stream
- Supports seeking/scrubbing (range requests)

---

## 💾 **Backend API Endpoints**

### **Upload Audio File**
```http
POST /api/audio/upload
Content-Type: multipart/form-data

Fields:
- audio: File (required)
- displayName: string (required)
- type: string (greeting, hold_music, announcement, ivr_prompt, voicemail, other)
- description: string (optional)
- tags: JSON array (optional)
- duration: number (auto-detected, optional override)
```

**Response:**
```json
{
  "success": true,
  "message": "Audio file uploaded successfully",
  "audioFile": {
    "id": "clxxx...",
    "filename": "greeting.mp3",
    "displayName": "Welcome Greeting",
    "mimeType": "audio/mpeg",
    "size": 245678,
    "duration": 12.5,
    "type": "greeting",
    "url": "/api/audio/clxxx...",
    "streamUrl": "/api/audio/stream/clxxx...",
    "uploadedAt": "2026-04-22T10:30:00Z"
  }
}
```

### **List All Audio Files**
```http
GET /api/audio
Query params:
- type: Filter by type (greeting, hold_music, etc.)
- search: Search in name, filename, description
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "audioFiles": [
    {
      "id": "clxxx...",
      "displayName": "Welcome Greeting",
      "duration": 12.5,
      "size": 245678,
      "url": "/api/audio/clxxx...",
      "streamUrl": "/api/audio/stream/clxxx..."
    }
  ]
}
```

### **Stream Audio File**
```http
GET /api/audio/stream/:id
Headers:
- Range: bytes=0-1023 (optional, for seeking)
```

**Response:**
- Binary audio data
- Supports range requests (206 Partial Content)
- Cache headers (1 year max-age)
- Proper MIME type (`audio/mpeg`, `audio/wav`, etc.)

### **Download Audio File**
```http
GET /api/audio/:id
```

**Response:**
- Full file download
- `Content-Disposition: attachment`
- Original filename preserved

### **Get Metadata Only**
```http
GET /api/audio/:id/metadata
```

**Response:**
- File info without binary data
- Useful for listings/previews

### **Update Audio Metadata**
```http
PATCH /api/audio/:id
Content-Type: application/json

{
  "displayName": "New Name",
  "type": "greeting",
  "description": "Updated description",
  "tags": ["important", "english"]
}
```

### **Delete Audio File**
```http
DELETE /api/audio/:id
```

**Response:**
- Success if not in use
- Error if used by inbound numbers
- Lists which numbers are using the file

---

## 🗄️ **Database Schema**

```sql
CREATE TABLE audio_files (
  id              TEXT PRIMARY KEY,
  filename        TEXT NOT NULL,
  displayName     TEXT NOT NULL,
  mimeType        TEXT NOT NULL,
  size            INTEGER NOT NULL,
  duration        REAL,
  type            TEXT DEFAULT 'other',
  description     TEXT,
  tags            TEXT, -- JSON array
  fileData        BYTEA NOT NULL, -- Binary audio data
  uploadedBy      TEXT,
  uploadedAt      TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audio_files_type ON audio_files(type);
CREATE INDEX idx_audio_files_uploadedBy ON audio_files(uploadedBy);
CREATE INDEX idx_audio_files_uploadedAt ON audio_files(uploadedAt);
```

---

## 📊 **Technical Details**

### **Supported Formats**
- **MP3** (`audio/mpeg`, `audio/mp3`)
- **WAV** (`audio/wav`, `audio/wave`, `audio/x-wav`)
- **M4A** (`audio/mp4`, `audio/x-m4a`)
- **AAC** (`audio/aac`)
- **OGG** (`audio/ogg`)
- **FLAC** (`audio/flac`)
- **WebM** (`audio/webm`)

### **File Size Limits**
- **Max file size:** 10MB per file
- **Recommended:** 1-3MB for telephony audio
- **Quality:** 16-bit, 8kHz or 16kHz for phone systems

### **Storage Capacity**
- PostgreSQL BYTEA type
- Practically unlimited (database size limit)
- Recommended: Keep total audio library under 1GB

### **Performance**
- **Streaming:** Supports range requests for seeking
- **Caching:** 1 year cache headers for performance
- **Compression:** Audio already compressed (MP3/AAC)
- **Concurrent playback:** No limit on simultaneous streams

---

## 🔒 **Security**

### **File Validation**
- MIME type checked on upload
- File extension validated
- Size limit enforced (10MB)
- Malicious file detection via MIME type

### **Access Control**
- TODO: Add authentication middleware
- Currently: All authenticated users can upload
- Future: Role-based access (admin only)

### **Data Protection**
- Files stored in encrypted database (if PostgreSQL encryption enabled)
- No public access without API key (future)
- Audit logging of uploads/deletes (future)

---

## 🚀 **Usage in Inbound Call Flow**

### **Greeting Audio**
```typescript
// Backend: inboundCallController.ts
if (inboundNumber.greetingAudioUrl) {
  // greetingAudioUrl = "/api/audio/stream/clxxx..."
  twiml.play(inboundNumber.greetingAudioUrl);
}
```

**How it works:**
1. Twilio receives inbound call
2. Webhook checks `inboundNumber.greetingAudioUrl`
3. TwiML `<Play>` tag points to `/api/audio/stream/{id}`
4. Twilio fetches audio from your backend
5. Audio plays to caller

### **Out-of-Hours Audio**
```typescript
if (!isBusinessHours && inboundNumber.outOfHoursAudioUrl) {
  twiml.play(inboundNumber.outOfHoursAudioUrl);
  twiml.hangup();
}
```

### **Voicemail Prompt**
```typescript
if (inboundNumber.voicemailAudioUrl) {
  twiml.play(inboundNumber.voicemailAudioUrl);
  twiml.record({ /* settings */ });
}
```

---

## ✅ **Testing Checklist**

### **Upload Test**
- [ ] Navigate to Admin → Channels → Voice → Audio Files
- [ ] Click "Upload Files"
- [ ] Select an MP3 or WAV file (< 10MB)
- [ ] File appears in list with correct duration
- [ ] No errors in browser console

### **Playback Test**
- [ ] Click ▶️ play button on uploaded file
- [ ] Audio plays immediately
- [ ] Can hear the audio clearly
- [ ] Click ⏸️ to pause
- [ ] Audio stops

### **Persistence Test**
- [ ] Upload a file
- [ ] Refresh the page (F5)
- [ ] File still appears in list
- [ ] Click play - audio still works

### **Inbound Number Test**
- [ ] Go to Admin → Channels → Voice → Inbound Numbers
- [ ] Edit an inbound number
- [ ] Set "Greeting Audio URL" to `/api/audio/stream/{your-file-id}`
- [ ] Save configuration
- [ ] Call the number
- [ ] Greeting audio plays to caller

---

## 🐛 **Troubleshooting**

### **Upload fails with "413 Payload Too Large"**
**Solution:** File is over 10MB. Compress or use a shorter audio clip.

### **Playback fails with "Failed to load audio"**
**Possible causes:**
1. Backend not running
2. File ID doesn't exist in database
3. Database connection issue

**Check:**
```bash
# Backend logs
docker logs kennex-backend

# Database query
psql -d omnivox_dev -c "SELECT id, displayName, size FROM audio_files;"
```

### **Duration shows as "0:00"**
**Cause:** Audio metadata couldn't be read

**Solution:**
1. Re-upload the file
2. Check file format is supported
3. Try converting to MP3

### **Twilio can't play the audio**
**Possible causes:**
1. Backend URL not publicly accessible
2. HTTPS not enabled
3. Firewall blocking Twilio's requests

**Solution:**
- Ensure backend is deployed on Railway (public URL)
- Check Twilio webhook logs for errors
- Use full URL: `https://kennex-production.up.railway.app/api/audio/stream/{id}`

---

## 📈 **Future Enhancements**

### **Planned Features**
- [ ] Text-to-speech generation (AI voices)
- [ ] Audio editing (trim, volume adjust)
- [ ] Bulk upload (drag & drop multiple files)
- [ ] Audio visualization (waveform display)
- [ ] Shared audio library (organization-wide)
- [ ] Audio categories/folders
- [ ] Version history (track changes)
- [ ] Usage analytics (play count, last used)

### **Performance Improvements**
- [ ] CDN caching layer
- [ ] Audio transcoding (optimize for telephony)
- [ ] Lazy loading for large libraries
- [ ] Progressive loading for playback

---

## 🎯 **Quick Reference**

| Action | Endpoint | Method |
|--------|----------|--------|
| Upload file | `/api/audio/upload` | POST |
| List files | `/api/audio` | GET |
| Stream file | `/api/audio/stream/:id` | GET |
| Download file | `/api/audio/:id` | GET |
| Get metadata | `/api/audio/:id/metadata` | GET |
| Update metadata | `/api/audio/:id` | PATCH |
| Delete file | `/api/audio/:id` | DELETE |

---

**🎵 Your audio files are now fully stored and managed by Omnivox!**

No external dependencies, no complicated setup, just upload and play!
