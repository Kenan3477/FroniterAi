import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Voice webhook handler for incoming calls
router.post('/voice', (req: Request, res: Response) => {
  console.log('📞 Incoming voice webhook:', req.body);
  
  // Generate TwiML to handle incoming calls
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome to Omnivox-AI. Please hold while we connect you to an agent.</Say>
  <Dial>
    <Conference 
      beep="false"
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      endConferenceOnExit="true"
    >inbound-${Date.now()}</Conference>
  </Dial>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Status webhook handler for call status updates
router.post('/status', (req: Request, res: Response) => {
  console.log('📊 Call status webhook:', req.body);
  
  const { CallSid, CallStatus, CallDuration, From, To } = req.body;
  
  // Log call status for monitoring
  console.log(`Call ${CallSid}: ${CallStatus} (Duration: ${CallDuration}s) ${From} → ${To}`);
  
  res.status(200).send('OK');
});

// Welcome/demo route for inbound calls
router.post('/welcome', (req: Request, res: Response) => {
  console.log('🎤 Welcome webhook called:', req.body);
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! You have reached Omnivox-AI. This is a demonstration of our outbound calling system. Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// Basic webhooks endpoint
router.post('/', (req, res) => {
  console.log('📨 Generic webhook received:', req.body);
  res.json({
    success: true,
    message: 'Webhook received'
  });
});

export default router;