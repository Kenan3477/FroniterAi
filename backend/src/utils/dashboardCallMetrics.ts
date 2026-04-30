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

/** Connected for KPI cards: ended call with duration, disposition, or positive terminal outcome. */
export function isStatsConnectedCall(args: {
  endTime: Date | null;
  outcome: string | null | undefined;
  duration: number | null | undefined;
  dispositionId: string | null | undefined;
}): boolean {
  if (!args.endTime) return false;
  const o = (args.outcome || '').toLowerCase();
  if ((args.duration ?? 0) > 0) return true;
  if (args.dispositionId) return true;
  const connectedOutcomes = [
    'completed',
    'connected',
    'answered',
    'in-progress',
    'sale',
    'interested',
    'callback',
    'appointment',
  ];
  return connectedOutcomes.some((x) => o === x.toLowerCase());
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
