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

/** Absolute URL for Twilio callbacks (Play, webhooks) — Twilio requires https and cannot use relative paths */
export function resolveAbsoluteBackendUrl(path: string): string | undefined {
  const base = getBackendBaseUrl();
  if (!base) return undefined;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Default greeting <Play> URL when inbound_numbers.greetingAudioUrl is empty */
export function resolveDefaultInboundGreetingUrl(): string | undefined {
  if (process.env.DEFAULT_INBOUND_GREETING_AUDIO_URL?.trim()) {
    return process.env.DEFAULT_INBOUND_GREETING_AUDIO_URL.trim();
  }
  const base = getBackendBaseUrl();
  if (!base) return undefined;
  return `${base}/audio/inbound-greeting.mp3`;
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
