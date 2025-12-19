# Twilio Voice Integration Setup Guide

## Overview
This guide explains how to set up the Twilio Voice integration for Kennex, allowing agents to make two-way calls through their browser.

## Architecture
```
Agent Browser (Twilio Voice SDK)
    ↓ (WebRTC)
Backend API (/api/calls/token)
    ↓
Twilio Account (Voice API)
    ↓ (PSTN)
Customer Phone
```

## Prerequisites
1. Twilio Account (trial or paid)
2. Twilio Account SID, Auth Token, API Key, API Secret
3. Verified Twilio Phone Number
4. TwiML Application (see setup below)

## Current Configuration

### Environment Variables (backend/.env)
```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=your_api_key_here
TWILIO_API_SECRET=your_api_secret_here
TWILIO_PHONE_NUMBER=your_phone_number_here
TWILIO_TWIML_APP_SID=(NEEDS TO BE CONFIGURED)
BACKEND_URL=http://localhost:3002
```

## Setup Steps

### Step 1: Create TwiML Application

1. Log into your Twilio Console: https://console.twilio.com
2. Navigate to **Voice** → **Manage** → **TwiML Apps**
3. Click **Create new TwiML App**
4. Configure the app:
   - **Friendly Name**: `Kennex Dialer`
   - **Voice Request URL**: `http://localhost:3002/api/calls/twiml`
   - **Voice Request Method**: `GET`
   - **Status Callback URL**: `http://localhost:3002/api/calls/status`
   - **Status Callback Method**: `POST`
5. Click **Save**
6. Copy the **TwiML App SID** (starts with `AP...`)
7. Add it to `backend/.env`:
   ```
   TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 2: Expose Backend Publicly (Development)

Since Twilio needs to reach your backend for TwiML instructions, you have two options:

#### Option A: Use ngrok (Recommended for Development)
```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3002

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update backend/.env:
BACKEND_URL=https://abc123.ngrok.io

# Update TwiML App Voice URL in Twilio Console:
# https://abc123.ngrok.io/api/calls/twiml
```

#### Option B: Deploy Backend to Cloud
Deploy your backend to a cloud provider (Heroku, Railway, Vercel, etc.) and use that URL.

### Step 3: Restart Backend
```bash
cd /Users/zenan/kennex
npm run dev
```

### Step 4: Verify Twilio Numbers

For trial accounts, verify the customer phone numbers:
1. Go to **Phone Numbers** → **Verified Caller IDs**
2. Click **Add a new number**
3. Enter the customer's phone number
4. Complete verification

## How It Works

### Call Flow
1. Agent logs into Kennex at http://localhost:3000/work
2. Agent clicks "Make Call" and enters customer phone number
3. Frontend calls `/api/calls/token` to get Twilio access token
4. Frontend initializes Twilio Voice SDK Device with token
5. Agent clicks dial, Twilio Device connects via WebRTC
6. Twilio calls `/api/calls/twiml?To=<customer>&From=<twilionum>`
7. Backend returns TwiML: `<Dial><Number>+44...</Number></Dial>`
8. Twilio bridges agent (browser) with customer (phone)
9. Two-way audio flows through browser

### Key Components

#### Frontend
- **TwilioClientDialer.tsx**: React component with Twilio Voice SDK
- **dialerApi.ts**: API client for backend calls
- **Work Page**: `/frontend/src/app/work/page.tsx`

#### Backend
- **twilioService.ts**: Twilio SDK wrapper (token generation, TwiML)
- **dialerController.ts**: API endpoints for dialer
- **dialer.ts**: Route definitions

## Testing

### Test Call Flow
1. Go to http://localhost:3000
2. Login as Albert (password: 3477)
3. Navigate to Work page
4. Wait for "Device Ready" indicator (green)
5. Enter a verified phone number: `+447929717470`
6. Click "Make Call"
7. You should hear ringing in browser
8. Customer's phone rings
9. When answered, two-way audio established

### Troubleshooting

#### Device Won't Initialize
- Check browser console for errors
- Verify API Key/Secret in backend/.env
- Check backend logs for token generation

#### Call Fails with "Invalid TwiML App"
- Verify `TWILIO_TWIML_APP_SID` is set in backend/.env
- Check TwiML App exists in Twilio Console
- Ensure TwiML App Voice URL points to your backend

#### Call Connects But No Audio
- Check browser microphone permissions
- Verify WebRTC is enabled in browser
- Check network firewall settings

#### Twilio Can't Reach TwiML Endpoint
- Verify ngrok is running: `ngrok http 3002`
- Update TwiML App Voice URL with ngrok HTTPS URL
- Check backend is running on port 3002

#### "Number Not Verified" Error (Trial Account)
- Go to Twilio Console → Verified Caller IDs
- Add and verify the customer's phone number
- Try calling again

## API Endpoints

### POST /api/calls/token
Generate Twilio access token for agent
```json
{
  "agentId": "albert"
}
```

### GET /api/calls/twiml
Generate TwiML for outbound call (called by Twilio)
```
GET /api/calls/twiml?To=+447929717470&From=+447487723751
```

### POST /api/calls/status
Status callback from Twilio (call events)

## Production Considerations

1. **Replace ngrok**: Deploy backend to production cloud provider
2. **Update TwiML App**: Point to production backend URL
3. **Add Authentication**: Secure TwiML endpoint
4. **Call Recording**: Configure recording storage
5. **Call Logging**: Save call details to database
6. **Error Handling**: Add comprehensive error handling
7. **Rate Limiting**: Add rate limits to prevent abuse

## Upgrade Path (Trial → Production)

1. Upgrade Twilio account to paid
2. Purchase phone numbers (no verification needed)
3. Enable call recording storage
4. Configure SIP domains for advanced features
5. Set up call queuing and IVR

## Support

- Twilio Documentation: https://www.twilio.com/docs/voice
- Twilio Voice SDK: https://www.twilio.com/docs/voice/sdks/javascript
- TwiML Reference: https://www.twilio.com/docs/voice/twiml
