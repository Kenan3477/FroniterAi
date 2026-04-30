/** MIME types Twilio Voice <Play> reliably supports (subset of Twilio docs). */
export function isTwilioPlayCompatibleMime(mime: string | null | undefined): boolean {
  if (!mime || typeof mime !== 'string') return false;
  const m = mime.toLowerCase().split(';')[0].trim();
  return (
    m === 'audio/mpeg' ||
    m === 'audio/mp3' ||
    m === 'audio/wav' ||
    m === 'audio/wave' ||
    m === 'audio/x-wav' ||
    m === 'audio/basic' ||
    m === 'audio/aiff' ||
    m === 'audio/x-aiff' ||
    m === 'audio/gsm' ||
    m === 'audio/x-gsm'
  );
}
