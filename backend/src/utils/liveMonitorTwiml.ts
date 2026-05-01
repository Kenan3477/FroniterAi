import { resolveConferenceWaitUrl } from '../config/voiceMedia';

/**
 * TwiML for supervisor listen-in: join conference muted, do not start/end conference.
 */
export function buildLiveMonitorConferenceTwiml(conferenceName: string): string {
  const waitUrl = resolveConferenceWaitUrl();
  const waitAttr = waitUrl ? ` waitUrl="${escapeXml(waitUrl)}"` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference${waitAttr} muted="true" startConferenceOnEnter="false" endConferenceOnExit="false" beep="false">${escapeXml(
      conferenceName,
    )}</Conference>
  </Dial>
</Response>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
