/**
 * Resolve Twilio conference room name from a call_record row.
 * REST outbound flow uses callId = conf-<timestamp>-<random>; notes may contain [CONF:conf-...].
 */
export function extractConferenceNameFromCallRecord(row: {
  callId: string;
  notes?: string | null;
}): string | null {
  const cid = (row.callId || '').trim();
  if (cid.toLowerCase().startsWith('conf-')) {
    return cid;
  }
  const notes = row.notes || '';
  const m = notes.match(/\[CONF:(conf-[^\]\s]+)\]/i);
  if (m?.[1]) return m[1].trim();
  return null;
}
