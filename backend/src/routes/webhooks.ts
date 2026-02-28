import { Router } from 'express';
import { Request, Response } from 'express';
import twilio from 'twilio';
import { prisma } from '../database/index';

const router = Router();

// Twilio webhook signature validation middleware
const validateTwilioSignature = (req: Request, res: Response, next: any) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('🚨 SECURITY: TWILIO_AUTH_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) {
    console.error('🚨 SECURITY: Webhook request missing Twilio signature');
    return res.status(401).json({ error: 'Unauthorized - Missing signature' });
  }

  const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const isValid = twilio.validateRequest(authToken, twilioSignature, requestUrl, req.body);
  
  if (!isValid) {
    console.error('🚨 SECURITY: Invalid Twilio webhook signature');
    return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
  }
  
  next();
};

// Voice webhook handler for incoming calls - SECURED WITH TWILIO SIGNATURE VERIFICATION
router.post('/voice', validateTwilioSignature, (req: Request, res: Response) => {
  console.log('📞 Legacy voice webhook - redirecting to new inbound call system:', req.body);
  
  // Redirect to new inbound call handling system
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${process.env.BACKEND_URL || 'https://superb-imagination-production.up.railway.app'}/api/calls/webhook/inbound-call</Redirect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Status webhook handler for call status updates - SECURED
router.post('/status', validateTwilioSignature, (req: Request, res: Response) => {
  console.log('📊 Call status webhook:', req.body);
  
  const { CallSid, CallStatus, CallDuration, From, To } = req.body;
  
  // Log call status for monitoring
  console.log(`Call ${CallSid}: ${CallStatus} (Duration: ${CallDuration}s) ${From} → ${To}`);
  
  res.status(200).send('OK');
});

// Recording webhook handler for when Twilio completes a recording - SECURED
router.post('/recording', validateTwilioSignature, async (req: Request, res: Response) => {
  try {
    console.log('🎵 Recording webhook received:', req.body);
    
    const { 
      RecordingSid, 
      CallSid, 
      RecordingUrl, 
      RecordingDuration, 
      RecordingStatus,
      RecordingChannels 
    } = req.body;

    if (RecordingStatus === 'completed') {
      console.log(`✅ Recording completed for call ${CallSid}: ${RecordingSid}`);
      
      // Find the call record - try both callId and exact CallSid match
      let callRecord = await prisma.callRecord.findFirst({
        where: { callId: CallSid }
      });

      // If not found by callId, try to find by any field that might contain CallSid
      if (!callRecord) {
        callRecord = await prisma.callRecord.findFirst({
          where: { 
            OR: [
              { recording: { contains: CallSid } },
              { notes: { contains: CallSid } }
            ]
          }
        });
      }

      if (callRecord) {
        // Create or update the recording record
        await prisma.recording.upsert({
          where: { callRecordId: callRecord.id },
          update: {
            fileName: `recording_${RecordingSid}.wav`,
            filePath: RecordingUrl,
            duration: parseInt(RecordingDuration) || 0,
            format: 'wav',
            uploadStatus: 'completed',
            updatedAt: new Date()
          },
          create: {
            callRecordId: callRecord.id,
            fileName: `recording_${RecordingSid}.wav`,
            filePath: RecordingUrl,
            duration: parseInt(RecordingDuration) || 0,
            format: 'wav',
            quality: RecordingChannels === '2' ? 'stereo' : 'mono',
            storageType: 'twilio',
            uploadStatus: 'completed'
          }
        });

        console.log(`📝 Recording saved for call ${CallSid}`);
      } else {
        console.warn(`⚠️ Call record not found for CallSid: ${CallSid}`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing recording webhook:', error);
    res.status(500).send('Error processing recording');
  }
});

// Welcome route for inbound calls - SECURED
router.post('/welcome', validateTwilioSignature, (req: Request, res: Response) => {
  console.log('🎤 Welcome webhook called:', req.body);
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold while we connect you to an available agent.</Say>
  <Pause length="2"/>
  <Redirect>/api/webhooks/queue</Redirect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Basic webhooks endpoint - SECURED
router.post('/', validateTwilioSignature, (req, res) => {
  console.log('📨 Generic webhook received:', req.body);
  res.json({
    success: true,
    message: 'Webhook received'
  });
});

export default router;