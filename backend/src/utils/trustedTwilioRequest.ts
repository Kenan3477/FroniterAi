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
