import { Request } from 'express';
import { getTwilioWebhookBaseUrl } from '../config/voiceMedia';

/**
 * Public URL Twilio used to reach this webhook (for signature validation).
 * Behind Railway/proxies, `req.protocol` can be `http` while Twilio signed `https://...`.
 * When TWILIO_PUBLIC_URL / PUBLIC_BACKEND_URL is set, prefer that origin so validation
 * matches the URL Twilio actually requested.
 */
export function getTwilioWebhookPublicUrl(req: Request): string {
  const configured = getTwilioWebhookBaseUrl();
  if (configured) {
    const path = req.originalUrl || req.url || '';
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${configured}${suffix}`;
  }

  const xfProto = (req.get('x-forwarded-proto') || '').split(',')[0]?.trim();
  const protocol = xfProto === 'https' || xfProto === 'http' ? xfProto : req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${protocol}://${host}${req.originalUrl}`;
}
