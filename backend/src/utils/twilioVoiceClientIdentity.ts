import { prisma } from '../lib/prisma';

const DEFAULT_CLIENT = 'agent-browser';

/**
 * Twilio Voice SDK `identity` must match `<Dial><Client>identity</Client></Dial>`.
 * Prefer the Agent row linked to the user by email; fall back to `agent-{userId}`.
 */
export async function resolveTwilioVoiceIdentityForUserId(userIdStr: string | undefined): Promise<string> {
  const fallback =
    (process.env.TWILIO_VOICE_CLIENT_IDENTITY || DEFAULT_CLIENT).trim() || DEFAULT_CLIENT;
  if (!userIdStr) return fallback;

  const uid = parseInt(String(userIdStr), 10);
  if (!Number.isFinite(uid)) return fallback;

  try {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { email: true },
    });
    if (!user?.email) return `agent-${uid}`;

    const agent = await prisma.agent.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { agentId: true },
    });
    if (agent?.agentId?.trim()) return agent.agentId.trim();

    return `agent-${uid}`;
  } catch {
    return fallback;
  }
}

/** Agents who should ring for inbound browser legs (same criteria as notifications). */
export async function resolveAvailableAgentVoiceIdentities(limit = 30): Promise<string[]> {
  try {
    const rows = await prisma.agent.findMany({
      where: {
        isLoggedIn: true,
        status: { equals: 'Available', mode: 'insensitive' },
      },
      select: { agentId: true },
      take: limit,
      orderBy: { firstName: 'asc' },
    });
    const ids = rows.map((r) => r.agentId?.trim()).filter(Boolean) as string[];
    return [...new Set(ids)];
  } catch {
    return [];
  }
}
