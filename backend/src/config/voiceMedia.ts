/**
 * Central place for non-TTS voice URLs (Play / Conference wait).
 * Prefer your own hosted MP3s; avoid Twilio demo/twimlets URLs when possible.
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Public backend base URL (Railway / prod), no trailing slash */
export function getBackendBaseUrl(): string | undefined {
  const u = process.env.BACKEND_URL?.trim();
  return u ? trimTrailingSlash(u) : undefined;
}

/**
 * Base URL Twilio must fetch (TwiML + webhooks). Prefer a dedicated public https URL.
 * Many deployments set BACKEND_URL to an internal http host; Twilio then cannot load TwiML.
 * Set TWILIO_PUBLIC_URL (or PUBLIC_BACKEND_URL) to the public Railway https URL.
 */
export function getTwilioWebhookBaseUrl(): string | undefined {
  const candidates = [
    process.env.TWILIO_PUBLIC_URL,
    process.env.PUBLIC_BACKEND_URL,
    process.env.PUBLIC_URL,
    process.env.BACKEND_URL,
  ]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => trimTrailingSlash(s.trim()));

  const seen = new Set<string>();
  for (const raw of candidates) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:') {
        return trimTrailingSlash(`${parsed.origin}`);
      }
    } catch {
      /* ignore */
    }
  }

  // Last resort: whatever BACKEND_URL is (may be http — caller may still fail Twilio validation)
  return getBackendBaseUrl();
}

/** True if Twilio can use this base for https callbacks and TwiML fetch. */
export function isHttpsTwilioBase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Absolute URL for Twilio callbacks (Play, webhooks) — Twilio requires https and cannot use relative paths */
export function resolveAbsoluteBackendUrl(path: string): string | undefined {
  const base = getTwilioWebhookBaseUrl();
  if (!base) return undefined;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Optional global greeting URL (e.g. point at your CDN). Inbound numbers should
 * normally use `greetingAudioUrl` on the InboundNumber row in Omnivox.
 */
export function resolveDefaultInboundGreetingUrl(): string | undefined {
  const env = process.env.DEFAULT_INBOUND_GREETING_AUDIO_URL?.trim();
  return env || undefined;
}

/** Twilio <Play> needs absolute https; relative paths become BACKEND_URL + path. */
export function toTwilioPlayableUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const u = url.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) {
    const base = getTwilioWebhookBaseUrl();
    if (!base) return undefined;
    return `${base}${u}`;
  }
  return u;
}

/**
 * Conference waitUrl: optional hosted hold loop.
 * If unset, callers wait in silence (no Twilio twimlets / demo music).
 */
export function resolveConferenceWaitUrl(): string | undefined {
  const custom = process.env.TWILIO_CONFERENCE_WAIT_URL?.trim();
  if (custom) return custom;
  return resolveAbsoluteBackendUrl('/api/calls/webhook/wait-music');
}

/** Normalize dialed number for DB lookup (Twilio may send tel: URI or spacing variants). */
export function normalizeInboundTo(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim().replace(/^tel:/i, '').replace(/\s+/g, '');
  if (!s) return null;
  if (s.startsWith('+')) return s;
  if (/^\d{10,15}$/.test(s)) return `+${s}`;
  return s;
}
