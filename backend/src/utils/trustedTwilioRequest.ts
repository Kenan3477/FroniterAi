import { Request } from 'express';

/**
 * Twilio Voice / webhooks always send X-Twilio-Signature. Treat these requests
 * as trusted for IP-whitelist and coarse security middleware: the real gate is
 * signature validation on the webhook routes that enforce it.
 */
export function hasTwilioSignatureHeader(req: Request): boolean {
  const h = req.get('X-Twilio-Signature') || (req.headers['x-twilio-signature'] as string | undefined);
  return typeof h === 'string' && h.length > 0;
}

/** Twilio HTTP fetches often use a Twilio-specific User-Agent (TwiML URL GET may omit signature). */
export function hasTwilioUserAgent(req: Request): boolean {
  const ua = (req.get('User-Agent') || '').toLowerCase();
  return ua.includes('twilio');
}

/**
 * True when this request is almost certainly Twilio fetching TwiML or posting
 * a voice webhook. The initial TwiML URL fetch is often a GET **without**
 * X-Twilio-Signature; relying on signature alone caused 429/403 → Twilio 11200.
 */
export function isTwilioVoiceHttpTraffic(req: Request): boolean {
  if (hasTwilioSignatureHeader(req)) return true;
  if (hasTwilioUserAgent(req)) return true;

  const path = `${req.baseUrl || ''}${req.path || ''}`.toLowerCase();
  const full = (req.originalUrl || '').toLowerCase();

  const hits = (s: string) =>
    s.includes('/twiml') ||
    s.includes('/recording-callback') ||
    s.includes('/recording-status') ||
    s.includes('/webhook/') ||
    s.includes('/webhooks/') ||
    s.includes('/api/dialer/webhook') ||
    s.includes('/api/calls/status') ||
    s.includes('/api/auto-dial/') ||
    s.includes('/live-status');

  return hits(path) || hits(full);
}
