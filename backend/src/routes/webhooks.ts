import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Voice webhook handler for incoming calls - REDIRECTED TO NEW INBOUND CALL SYSTEM
router.post('/voice', (req: Request, res: Response) => {
  console.log('📞 Legacy voice webhook - redirecting to new inbound call system:', req.body);
  
  // Redirect to new inbound call handling system
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${process.env.BACKEND_URL || 'https://superb-imagination-production.up.railway.app'}/api/calls/webhook/inbound-call</Redirect>
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

// Welcome route for inbound calls
router.post('/welcome', (req: Request, res: Response) => {
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

// Basic webhooks endpoint
router.post('/', (req, res) => {
  console.log('📨 Generic webhook received:', req.body);
  res.json({
    success: true,
    message: 'Webhook received'
  });
});

export default router;