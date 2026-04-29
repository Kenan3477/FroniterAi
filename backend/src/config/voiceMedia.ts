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
  const base = getBackendBaseUrl();
  if (!base) return undefined;
  return `${base}/api/calls/webhook/wait-music`;
}
