import { Request } from 'express';

/**
 * Public URL Twilio used to reach this webhook (for signature validation).
 * Behind Railway/proxies, `req.protocol` can be `http` while Twilio signed `https://...`.
 */
export function getTwilioWebhookPublicUrl(req: Request): string {
  const xfProto = (req.get('x-forwarded-proto') || '').split(',')[0]?.trim();
  const protocol = xfProto === 'https' || xfProto === 'http' ? xfProto : req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${protocol}://${host}${req.originalUrl}`;
}
