const TERMINAL_TWILIO_OUTCOMES = new Set([
  'completed',
  'busy',
  'failed',
  'no-answer',
  'canceled',
  'abandoned',
]);

export function isLikelyConnectedCall(
  outcome: string | null | undefined,
  duration: number | null | undefined,
): boolean {
  const o = (outcome || '').toLowerCase();
  if (TERMINAL_TWILIO_OUTCOMES.has(o) && o !== 'completed') return false;
  if (o === 'in-progress' || o === 'ringing' || o === 'queued') return true;
  if ((duration ?? 0) > 0) return true;
  if (['connected', 'answered', 'sale', 'interested', 'callback', 'appointment'].includes(o)) return true;
  return false;
}

export function isConversionOutcome(
  outcome: string | null | undefined,
  dispositionName: string | null | undefined,
): boolean {
  const o = (outcome || '').toLowerCase();
  const d = (dispositionName || '').toLowerCase();
  const positives = ['sale', 'interested', 'callback', 'appointment', 'contact_made', 'converted'];
  return positives.some((p) => o.includes(p) || d.includes(p));
}

const TERMINAL_NOT_CONNECTED = new Set([
  'no-answer',
  'no_answer',
  'busy',
  'failed',
  'canceled',
  'cancelled',
  'abandoned',
]);

/** Meaningful human connection: ended + (talk time or explicit positive outcome), not a hard no-connect. */
export function isStatsConnectedCall(args: {
  endTime: Date | null;
  outcome: string | null | undefined;
  duration: number | null | undefined;
  dispositionId: string | null | undefined;
}): boolean {
  if (!args.endTime) return false;
  const o = (args.outcome || '').toLowerCase();
  if (TERMINAL_NOT_CONNECTED.has(o)) return false;

  if ((args.duration ?? 0) > 0) return true;

  const connectedOutcomes = [
    'completed',
    'connected',
    'answered',
    'in-progress',
    'in_progress',
    'sale',
    'interested',
    'callback',
    'appointment',
    'contact_made',
    'contact-made',
  ];
  if (connectedOutcomes.some((x) => o === x.toLowerCase())) return true;

  // Do not treat "any disposition" as connected — many dispositions are logged on no-answer / failed legs.
  return false;
}

export function isStatsSaleOrConversion(args: {
  outcome: string | null | undefined;
  dispositionName: string | null | undefined;
}): boolean {
  const o = (args.outcome || '').toLowerCase();
  const d = (args.dispositionName || '').toLowerCase();
  if (['sale', 'sale_made'].includes(o)) return true;
  if (o.includes('sale')) return true;
  if (d.includes('sale')) return true;
  return isConversionOutcome(args.outcome, args.dispositionName);
}
