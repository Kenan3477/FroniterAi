# Audio Prompts Directory

This directory contains pre-recorded audio files used to replace Twilio TTS.

## Required Files (14 total)

Place your recorded MP3 files here with these exact filenames:

### British English Voice (7 files)
- `inbound-greeting.mp3`
- `agents-busy.mp3`
- `transfer-initiating.mp3`
- `transfer-failed.mp3`
- `call-on-hold.mp3`
- `voicemail-prompt.mp3`
- `voicemail-thankyou.mp3`

### American English Voice (7 files)
- `customer-connecting-outbound.mp3`
- `agents-unavailable.mp3`
- `agent-connecting-inbound.mp3`
- `agent-connecting-conference.mp3`
- `agent-connected.mp3`
- `system-error.mp3`
- `connection-failed.mp3`

## File Requirements

- Format: MP3
- Bitrate: 128kbps minimum (192kbps recommended)
- Sample Rate: 16kHz minimum (48kHz recommended)
- Channels: Mono (1 channel)
- Max file size: ~100KB per file

## Access URLs

Once deployed to Railway, files will be accessible at:
```
https://froniterai-production.up.railway.app/audio/{filename}.mp3
```

Example:
```
https://froniterai-production.up.railway.app/audio/inbound-greeting.mp3
```

## Testing

Verify files are accessible:
```bash
curl -I https://froniterai-production.up.railway.app/audio/inbound-greeting.mp3
```

Should return: `HTTP/1.1 200 OK`
