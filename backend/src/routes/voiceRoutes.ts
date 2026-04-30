import express from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

import { prisma } from '../lib/prisma';
const router = express.Router();

/** Non-empty string from request body — empty string must NOT count as "user provided a value". */
function meaningfulBodyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Resolve an "audio file reference" coming from the inbound-number admin form
 * to an absolute, public URL that Twilio can fetch via <Play>.
 *
 * The form lets users pick an audio file from a dropdown whose `<option value>`
 * is the AudioFile DB row ID (e.g. "cmoif0qyc000e9nybpzc6pbk6"). Previously we
 * stored that bare ID into `greetingAudioUrl` / `outOfHoursAudioUrl` /
 * `voicemailAudioUrl`, then handed it to Twilio with `twiml.play(value)`.
 * Twilio's <Play> needs a URL; a bare CUID resolves to nothing, so the call
 * fell through to twiml.hangup() (silent) and the user thought "the system is
 * still relying on TTS". It wasn't TTS — it was silence followed by Twilio's
 * default error message.
 *
 * This helper accepts:
 *   - An empty / falsy value → returns null (clears the field).
 *   - A full http(s) URL       → returned unchanged (user pasted a URL).
 *   - A relative path starting with /api/voice/audio-files → prefixed with
 *     BACKEND_URL so Twilio can reach it.
 *   - Anything else (treated as an AudioFile ID) → looked up in the DB; if it
 *     exists, we return an absolute stream URL pointing at our public stream
 *     endpoint. If the ID doesn't resolve, we return null and log a warning so
 *     we never silently persist garbage.
 */
/** Reverse of resolveAudioFileToUrl — for admin UI dropdowns that store AudioFile row IDs. */
function extractAudioFileIdFromStreamUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const m = url.trim().match(/\/api\/voice\/audio-files\/([^/?#]+)\//i);
  return m?.[1];
}

async function resolveAudioFileToUrl(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already an absolute URL — pass through.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.PUBLIC_BACKEND_URL ||
    'https://froniterai-production.up.railway.app';

  // Relative path → make absolute.
  if (trimmed.startsWith('/')) {
    return `${backendUrl.replace(/\/$/, '')}${trimmed}`;
  }

  // Treat as an AudioFile ID: confirm it exists, then return the public stream
  // URL. The /api/voice/audio-files/:id/stream endpoint is intentionally
  // unauthenticated so Twilio's CDN can fetch it.
  try {
    const audioFile = await prisma.audioFile.findUnique({
      where: { id: trimmed },
      select: { id: true, displayName: true },
    });
    if (audioFile) {
      const url = `${backendUrl.replace(/\/$/, '')}/api/voice/audio-files/${audioFile.id}/stream`;
      console.log(
        `🎵 Resolved audio file ID ${audioFile.id} (${audioFile.displayName}) → ${url}`,
      );
      return url;
    }
    console.warn(
      `⚠️ Audio file ID "${trimmed}" not found in DB; refusing to persist as URL`,
    );
    return null;
  } catch (err: any) {
    console.warn(
      `⚠️ Could not resolve audio file ID "${trimmed}": ${err?.message || err}`,
    );
    return null;
  }
}

/**
 * Resolve all four (currently used) audio slots in one go. Accepts the legacy
 * frontend field names (*AudioFile) as fallbacks for the canonical *AudioUrl
 * fields.
 */
async function resolveInboundAudioUrls(input: {
  greetingAudioUrl?: string | null;
  noAnswerAudioUrl?: string | null;
  outOfHoursAudioUrl?: string | null;
  busyAudioUrl?: string | null;
  voicemailAudioUrl?: string | null;
  queueAudioUrl?: string | null;
  // Legacy form field names that older versions of the React form sent.
  greetingAudioFile?: string | null;
  noAnswerAudioFile?: string | null;
  outOfHoursAudioFile?: string | null;
  busyAudioFile?: string | null;
  voicemailAudioFile?: string | null;
  queueAudioFile?: string | null;
  businessHoursAudioFile?: string | null;
  businessHoursVoicemailFile?: string | null;
}) {
  const [greeting, noAnswer, outOfHours, busy, voicemail, queue] = await Promise.all([
    resolveAudioFileToUrl(input.greetingAudioUrl ?? input.greetingAudioFile ?? input.businessHoursAudioFile),
    resolveAudioFileToUrl(input.noAnswerAudioUrl ?? input.noAnswerAudioFile),
    resolveAudioFileToUrl(input.outOfHoursAudioUrl ?? input.outOfHoursAudioFile),
    resolveAudioFileToUrl(input.busyAudioUrl ?? input.busyAudioFile),
    resolveAudioFileToUrl(
      input.voicemailAudioUrl ?? input.voicemailAudioFile ?? input.businessHoursVoicemailFile,
    ),
    resolveAudioFileToUrl(input.queueAudioUrl ?? input.queueAudioFile),
  ]);
  return {
    greetingAudioUrl: greeting,
    noAnswerAudioUrl: noAnswer,
    outOfHoursAudioUrl: outOfHours,
    busyAudioUrl: busy,
    voicemailAudioUrl: voicemail,
    queueAudioUrl: queue,
  };
}

// ── Auto-seed known Twilio numbers on startup ──────────────────────────────
const KNOWN_NUMBERS = [
  {
    phoneNumber: '+442046343130',
    displayName: 'UK Local - London',
    description: 'Primary outbound London CLI',
    country: 'GB', region: 'London', numberType: 'LOCAL'
  },
  {
    phoneNumber: '+441642053664',
    displayName: 'UK Local - Teesside',
    description: 'Teesside / Middlesbrough outbound CLI',
    country: 'GB', region: 'Teesside', numberType: 'LOCAL'
  }
];

// Seed function that can be awaited
async function seedInboundNumbers() {
  try {
    console.log('📞 Seeding inbound numbers...');
    for (const num of KNOWN_NUMBERS) {
      const existing = await prisma.inboundNumber.findFirst({ where: { phoneNumber: num.phoneNumber } });
      if (!existing) {
        const created = await prisma.inboundNumber.create({
          data: {
            ...num,
            provider: 'TWILIO',
            capabilities: JSON.stringify(['VOICE', 'SMS']),
            isActive: true,
            businessHours: '24 Hours',
            outOfHoursAction: 'Hangup',
            routeTo: 'Agent',
            recordCalls: true,
            autoRejectAnonymous: true,
            createContactOnAnonymous: true,
            integration: 'None',
            countryCode: 'United Kingdom Of Great Britain And Northern Ireland (The) (GB)',
            lookupSearchFilter: 'All Lists',
            assignedToDefaultList: true,
            timezone: 'Europe/London',
            businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
            businessHoursStart: '09:00',
            businessHoursEnd: '17:00'
          }
        });
        console.log(`✅ Seeded inbound number: ${num.phoneNumber} (${num.displayName}) - ID: ${created.id}`);
      } else {
        console.log(`ℹ️  Inbound number already exists: ${num.phoneNumber} - ID: ${existing.id}`);
        if (!existing.isActive) {
          await prisma.inboundNumber.update({ where: { id: existing.id }, data: { isActive: true } });
          console.log(`📞 Re-activated number: ${num.phoneNumber}`);
        }
      }
    }
    // Fix legacy rows that still hang up on inbound (e.g. old seeds with routeTo Hangup)
    const fixList = KNOWN_NUMBERS.map((n) => n.phoneNumber);
    const fixed = await prisma.inboundNumber.updateMany({
      where: { phoneNumber: { in: fixList }, routeTo: 'Hangup' },
      data: { routeTo: 'Agent' }
    });
    if (fixed.count > 0) {
      console.log(`📞 Updated ${fixed.count} inbound number(s) from Hangup → Agent routing`);
    }
  } catch (err: any) {
    console.error('❌ Number seed failed:', err);
    throw err; // Re-throw to prevent routes from working with bad data
  }
}

// Run seed on startup
seedInboundNumbers().catch(err => console.error('Failed to seed inbound numbers:', err));
// ──────────────────────────────────────────────────────────────────────────

interface InboundNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  description?: string;
  country: string;
  region: string;
  numberType: string;
  provider: string;
  capabilities: string[];
  isActive: boolean;
  greetingAudioUrl?: string;
  noAnswerAudioUrl?: string;
  outOfHoursAudioUrl?: string;
  busyAudioUrl?: string;
  voicemailAudioUrl?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/voice/inbound-numbers - Get available inbound numbers for CLI selection
router.get('/inbound-numbers', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📞 === INBOUND NUMBERS GET ROUTE DEBUG ===');
    console.log('📞 Fetching inbound numbers from database...');
    console.log('🎯 Expected: Only +442046343130 (real Twilio number)');
    
    // First, check ALL inbound numbers without filtering
    const allNumbers = await prisma.inboundNumber.findMany();
    console.log(`🔍 TOTAL numbers in database: ${allNumbers.length}`);
    allNumbers.forEach((num: any, index: number) => {
      console.log(`   ${index + 1}. Phone: ${num.phoneNumber}, Active: ${num.isActive}, ID: ${num.id}`);
    });
    
    // Now fetch active inbound numbers from database.
    // ⚠️ The Prisma relation on `InboundNumber.assignedFlowId` is named `flows`
    // in schema.prisma, NOT `assignedFlow`. Using the wrong include name throws
    // P2009 "Unknown field `assignedFlow`" and the GET endpoint returns 500,
    // which is what was breaking the inbound-number admin page entirely.
    console.log('🔍 Now filtering for isActive: true...');
    const inbound_numbers = await prisma.inboundNumber.findMany({
      where: {
        isActive: true
      },
      include: {
        flows: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: [
        { country: 'asc' },
        { numberType: 'asc' },
        { phoneNumber: 'asc' }
      ]
    });

    console.log(`📊 Database returned ${inbound_numbers.length} inbound numbers`);
    inbound_numbers.forEach((num: any) => console.log(`   - ${num.phoneNumber} (${num.displayName})`));

    // Parse capabilities field (stored as JSON string) and transform for response
    const transformedNumbers = inbound_numbers.map((number: any) => ({
      id: number.id,
      phoneNumber: number.phoneNumber,
      displayName: number.displayName,
      description: number.description,
      country: number.country,
      region: number.region,
      numberType: number.numberType,
      provider: number.provider,
      capabilities: (() => {
        if (!number.capabilities) return [];
        if (typeof number.capabilities === 'object') return number.capabilities;
        try {
          return JSON.parse(number.capabilities);
        } catch {
          return [];
        }
      })(),
      isActive: number.isActive,
      greetingAudioUrl: number.greetingAudioUrl,
      noAnswerAudioUrl: number.noAnswerAudioUrl,
      outOfHoursAudioUrl: number.outOfHoursAudioUrl,
      busyAudioUrl: number.busyAudioUrl,
      voicemailAudioUrl: number.voicemailAudioUrl,
      queueAudioUrl: number.queueAudioUrl,
      businessHoursStart: number.businessHoursStart,
      businessHoursEnd: number.businessHoursEnd,
      businessDays: number.businessDays,
      timezone: number.timezone,
      assignedFlowId: number.assignedFlowId,
      // Prisma relation is `flows`; API exposes `assignedFlow` for the Channels UI.
      assignedFlow: number.flows ?? null,
      // ✅ CRITICAL: Return persisted configuration from database
      businessHours: number.businessHours || "24 Hours",
      outOfHoursAction: number.outOfHoursAction || "Hangup", 
      routeTo: number.routeTo || "Hangup",
      outOfHoursTransferNumber: number.outOfHoursTransferNumber || null,
      selectedFlowId: number.selectedFlowId || null,
      selectedQueueId: number.selectedQueueId || null,
      selectedRingGroupId: number.selectedRingGroupId || null,
      selectedExtension: number.selectedExtension || null,
      autoRejectAnonymous: number.autoRejectAnonymous !== undefined ? number.autoRejectAnonymous : true,
      createContactOnAnonymous: number.createContactOnAnonymous !== undefined ? number.createContactOnAnonymous : true,
      integration: number.integration || "None",
      countryCode: number.countryCode || "United Kingdom Of Great Britain And Northern Ireland (The) (GB)",
      recordCalls: number.recordCalls !== undefined ? number.recordCalls : true,
      lookupSearchFilter: number.lookupSearchFilter || "All Lists",
      assignedToDefaultList: number.assignedToDefaultList !== undefined ? number.assignedToDefaultList : true,
      createdAt: number.createdAt,
      updatedAt: number.updatedAt
    }));

    console.log('✅ Returning', transformedNumbers.length, 'inbound numbers');

    res.json({
      success: true,
      data: transformedNumbers
    });

  } catch (error) {
    console.error('❌ Error fetching inbound numbers:', error);
    
    // Return error instead of fallback - this will help debug issues
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inbound numbers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/voice/inbound-numbers - Create a new inbound number (for seeding)
router.post('/inbound-numbers', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📞 Creating new inbound number...');
    
    const {
      phoneNumber,
      displayName,
      description,
      country = 'GB',
      region,
      numberType = 'LOCAL',
      provider = 'TWILIO',
      capabilities = ['VOICE', 'SMS'],
      isActive = true
    } = req.body;

    if (!phoneNumber || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and display name are required'
      });
    }

    const newInboundNumber = await prisma.inboundNumber.create({
      data: {
        phoneNumber,
        displayName,
        description,
        country,
        region,
        numberType,
        provider,
        capabilities: JSON.stringify(capabilities),
        isActive
      }
    });

    console.log(`✅ Created inbound number: ${phoneNumber} (${displayName})`);

    res.json({
      success: true,
      data: {
        id: newInboundNumber.id,
        phoneNumber: newInboundNumber.phoneNumber,
        displayName: newInboundNumber.displayName,
        description: newInboundNumber.description,
        country: newInboundNumber.country,
        region: newInboundNumber.region,
        numberType: newInboundNumber.numberType,
        provider: newInboundNumber.provider,
        capabilities: newInboundNumber.capabilities ? JSON.parse(newInboundNumber.capabilities) : [],
        isActive: newInboundNumber.isActive,
        createdAt: newInboundNumber.createdAt,
        updatedAt: newInboundNumber.updatedAt
      }
    });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Inbound number already exists'
      });
    }
    
    console.error('Error creating inbound number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create inbound number'
    });
  }
});

// PUT /api/voice/inbound-numbers/:id - Update an inbound number configuration
router.put('/inbound-numbers/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('🔧 === PUT /inbound-numbers/:id START ===');
    console.log('🔧 Request ID:', id);
    console.log('🔧 Request body keys:', Object.keys(req.body));
    console.log('🔧 Full request body:', JSON.stringify(req.body, null, 2));
    
    const {
      displayName,
      description,
      greetingAudioUrl,
      noAnswerAudioUrl,
      outOfHoursAudioUrl,
      busyAudioUrl,
      voicemailAudioUrl,
      queueAudioUrl,
      businessHoursStart,
      businessHoursEnd,
      businessDays,
      timezone,
      isActive,
      assignedFlowId,
      // New configuration fields
      businessHours,
      outOfHoursAction,
      routeTo,
      voicemailAudioFile,
      businessHoursVoicemailFile,
      outOfHoursAudioFile,
      outOfHoursTransferNumber,
      selectedFlowId,
      selectedQueueId,
      selectedRingGroupId,
      selectedExtension,
      autoRejectAnonymous,
      createContactOnAnonymous,
      integration,
      countryCode,
      recordCalls,
      lookupSearchFilter,
      assignedToDefaultList
    } = req.body;

    console.log('🔧 PUT /inbound-numbers/:id - Received fields:', {
      id, displayName, outOfHoursAction, routeTo, voicemailAudioFile, businessHoursVoicemailFile
    });

    // First, check if the inbound number exists
    const existingNumber = await prisma.inboundNumber.findUnique({
      where: { id }
    });

    if (!existingNumber) {
      console.error('❌ Inbound number not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Inbound number not found'
      });
    }

    console.log('✅ Found existing inbound number:', existingNumber.phoneNumber);

    // Validate flow exists if assignedFlowId is provided
    const finalFlowId = assignedFlowId || selectedFlowId;
    if (finalFlowId) {
      const flow = await prisma.flow.findUnique({
        where: { id: finalFlowId }
      });
      if (!flow) {
        return res.status(400).json({
          success: false,
          error: 'Assigned flow not found'
        });
      }
    }

    // 🎵 Resolve audio file IDs / paths to absolute URLs that Twilio can fetch.
    // The frontend dropdowns use AudioFile row IDs as values (because that's
    // what the user sees in the picker). Twilio <Play> needs a real URL.
    // Without this conversion, the inbound webhook would fall through to
    // twiml.hangup() (no audio configured) and the call drops silently.
    const resolvedAudio = await resolveInboundAudioUrls({
      // Canonical *AudioUrl fields (preferred; might already be a URL).
      greetingAudioUrl,
      noAnswerAudioUrl,
      outOfHoursAudioUrl,
      busyAudioUrl,
      voicemailAudioUrl,
      queueAudioUrl,
      // *AudioFile fields sent by the current admin form (these hold AudioFile
      // row IDs and are the primary source of truth post-fix). Each is read
      // from req.body in case TS strips fields not declared in the destructure.
      greetingAudioFile: (req.body as any).greetingAudioFile,
      noAnswerAudioFile: (req.body as any).noAnswerAudioFile,
      outOfHoursAudioFile,
      busyAudioFile: (req.body as any).busyAudioFile,
      voicemailAudioFile,
      queueAudioFile: (req.body as any).queueAudioFile,
      businessHoursAudioFile: (req.body as any).businessHoursAudioFile,
      businessHoursVoicemailFile,
    });

    console.log('🎵 Resolved audio URLs for inbound number:', {
      greetingAudioUrl: resolvedAudio.greetingAudioUrl,
      noAnswerAudioUrl: resolvedAudio.noAnswerAudioUrl,
      outOfHoursAudioUrl: resolvedAudio.outOfHoursAudioUrl,
      busyAudioUrl: resolvedAudio.busyAudioUrl,
      voicemailAudioUrl: resolvedAudio.voicemailAudioUrl,
      queueAudioUrl: resolvedAudio.queueAudioUrl,
    });

    // Map fields to existing database columns. We only overwrite each audio
    // URL when the request sent something for it (treat `undefined` as
    // "leave alone"); otherwise the existing value is preserved.
    //
    // The frontend may send EITHER the *AudioUrl form (legacy: user pasted a
    // URL) OR the *AudioFile form (current: user picked from a dropdown of
    // uploaded audio files). Both paths get resolved via
    // resolveInboundAudioUrls() above.
    const greetingProvided =
      meaningfulBodyString(greetingAudioUrl) ||
      meaningfulBodyString((req.body as any).greetingAudioFile) ||
      meaningfulBodyString((req.body as any).businessHoursAudioFile);
    const noAnswerProvided =
      meaningfulBodyString(noAnswerAudioUrl) ||
      meaningfulBodyString((req.body as any).noAnswerAudioFile);
    const outOfHoursProvided =
      meaningfulBodyString(outOfHoursAudioUrl) || meaningfulBodyString(outOfHoursAudioFile);
    const busyProvided =
      meaningfulBodyString(busyAudioUrl) || meaningfulBodyString((req.body as any).busyAudioFile);
    const voicemailProvided =
      meaningfulBodyString(voicemailAudioUrl) ||
      meaningfulBodyString(voicemailAudioFile) ||
      meaningfulBodyString(businessHoursVoicemailFile);
    const queueProvided =
      meaningfulBodyString(queueAudioUrl) || meaningfulBodyString((req.body as any).queueAudioFile);

    const updateData: any = {
      displayName,
      description: description || `Inbound number ${req.params.id}`,
      greetingAudioUrl: greetingProvided
        ? resolvedAudio.greetingAudioUrl
        : existingNumber.greetingAudioUrl,
      noAnswerAudioUrl: noAnswerProvided
        ? resolvedAudio.noAnswerAudioUrl
        : existingNumber.noAnswerAudioUrl,
      outOfHoursAudioUrl: outOfHoursProvided
        ? resolvedAudio.outOfHoursAudioUrl
        : existingNumber.outOfHoursAudioUrl,
      busyAudioUrl: busyProvided
        ? resolvedAudio.busyAudioUrl
        : existingNumber.busyAudioUrl,
      voicemailAudioUrl: voicemailProvided
        ? resolvedAudio.voicemailAudioUrl
        : existingNumber.voicemailAudioUrl,
      queueAudioUrl: queueProvided ? resolvedAudio.queueAudioUrl : existingNumber.queueAudioUrl,
      businessHoursStart,
      businessHoursEnd,
      businessDays,
      timezone,
      isActive,
      assignedFlowId: finalFlowId || null,
      // ✅ CRITICAL: Save all configuration fields to database for persistence
      businessHours: businessHours !== undefined ? businessHours : existingNumber.businessHours,
      outOfHoursAction: outOfHoursAction !== undefined ? outOfHoursAction : existingNumber.outOfHoursAction,
      routeTo: routeTo !== undefined ? routeTo : existingNumber.routeTo,
      outOfHoursTransferNumber: outOfHoursTransferNumber !== undefined ? outOfHoursTransferNumber : existingNumber.outOfHoursTransferNumber,
      selectedFlowId:
        selectedFlowId !== undefined
          ? meaningfulBodyString(selectedFlowId)
            ? selectedFlowId
            : null
          : existingNumber.selectedFlowId,
      selectedQueueId:
        selectedQueueId !== undefined
          ? meaningfulBodyString(selectedQueueId)
            ? selectedQueueId
            : null
          : existingNumber.selectedQueueId,
      selectedRingGroupId:
        selectedRingGroupId !== undefined
          ? meaningfulBodyString(selectedRingGroupId)
            ? selectedRingGroupId
            : null
          : existingNumber.selectedRingGroupId,
      selectedExtension:
        selectedExtension !== undefined
          ? meaningfulBodyString(selectedExtension)
            ? selectedExtension
            : null
          : existingNumber.selectedExtension,
      autoRejectAnonymous: autoRejectAnonymous !== undefined ? autoRejectAnonymous : existingNumber.autoRejectAnonymous,
      createContactOnAnonymous: createContactOnAnonymous !== undefined ? createContactOnAnonymous : existingNumber.createContactOnAnonymous,
      integration: integration !== undefined ? integration : existingNumber.integration,
      countryCode: countryCode !== undefined ? countryCode : existingNumber.countryCode,
      recordCalls: recordCalls !== undefined ? recordCalls : existingNumber.recordCalls,
      lookupSearchFilter: lookupSearchFilter !== undefined ? lookupSearchFilter : existingNumber.lookupSearchFilter,
      assignedToDefaultList: assignedToDefaultList !== undefined ? assignedToDefaultList : existingNumber.assignedToDefaultList,
      updatedAt: new Date()
    };

    console.log('🔧 Updating database with:', updateData);

    // Update the inbound number in the database.
    // The Prisma relation field is `flows` (see schema.prisma → model InboundNumber).
    const updatedNumber: any = await prisma.inboundNumber.update({
      where: { id },
      data: updateData,
      include: {
        flows: finalFlowId
          ? {
              select: {
                id: true,
                name: true,
                status: true,
              },
            }
          : false,
      },
    });

    console.log('✅ Database updated successfully');

    // ✅ CRITICAL: Return the SAVED values from database, not the request body
    // This ensures frontend sees what's actually persisted
    const transformedNumber = {
      id: updatedNumber.id,
      phoneNumber: updatedNumber.phoneNumber,
      displayName: updatedNumber.displayName,
      description: updatedNumber.description,
      country: updatedNumber.country,
      region: updatedNumber.region,
      numberType: updatedNumber.numberType,
      provider: updatedNumber.provider,
      capabilities: updatedNumber.capabilities ? JSON.parse(updatedNumber.capabilities) : [],
      isActive: updatedNumber.isActive,
      greetingAudioUrl: updatedNumber.greetingAudioUrl,
      noAnswerAudioUrl: updatedNumber.noAnswerAudioUrl,
      outOfHoursAudioUrl: updatedNumber.outOfHoursAudioUrl,
      busyAudioUrl: updatedNumber.busyAudioUrl,
      voicemailAudioUrl: updatedNumber.voicemailAudioUrl,
      queueAudioUrl: updatedNumber.queueAudioUrl,
      businessHoursStart: updatedNumber.businessHoursStart,
      businessHoursEnd: updatedNumber.businessHoursEnd,
      businessDays: updatedNumber.businessDays,
      timezone: updatedNumber.timezone,
      assignedFlowId: updatedNumber.assignedFlowId,
      // Frontend expects `assignedFlow`; Prisma relation is `flows`.
      assignedFlow: updatedNumber.flows ?? null,
      // Return the PERSISTED configuration from database
      businessHours: updatedNumber.businessHours,
      outOfHoursAction: updatedNumber.outOfHoursAction,
      routeTo: updatedNumber.routeTo,
      outOfHoursTransferNumber: updatedNumber.outOfHoursTransferNumber,
      selectedFlowId: updatedNumber.selectedFlowId,
      selectedQueueId: updatedNumber.selectedQueueId,
      selectedRingGroupId: updatedNumber.selectedRingGroupId,
      selectedExtension: updatedNumber.selectedExtension,
      autoRejectAnonymous: updatedNumber.autoRejectAnonymous,
      createContactOnAnonymous: updatedNumber.createContactOnAnonymous,
      integration: updatedNumber.integration,
      countryCode: updatedNumber.countryCode,
      recordCalls: updatedNumber.recordCalls,
      lookupSearchFilter: updatedNumber.lookupSearchFilter,
      assignedToDefaultList: updatedNumber.assignedToDefaultList,
      createdAt: updatedNumber.createdAt,
      updatedAt: updatedNumber.updatedAt
    };

    console.log('📤 Returning updated inbound number:', {
      id: transformedNumber.id,
      phoneNumber: transformedNumber.phoneNumber,
      outOfHoursAction: transformedNumber.outOfHoursAction,
      routeTo: transformedNumber.routeTo,
      voicemailAudioUrl: transformedNumber.voicemailAudioUrl,
      outOfHoursAudioUrl: transformedNumber.outOfHoursAudioUrl
    });

    res.json({
      success: true,
      data: transformedNumber
    });

  } catch (error) {
    console.error('❌ Error updating inbound number:', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update inbound number',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;