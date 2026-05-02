import type { Request } from 'express';
import { prisma } from '../database/index';

/**
 * Agents may only read transcripts for calls they handled; elevated roles may read any.
 */
export async function assertUserCanReadCallTranscript(
  user: NonNullable<Request['user']>,
  callRecordId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERVISOR') {
    return { ok: true };
  }

  const uid = parseInt(String(user.userId), 10);
  if (!Number.isFinite(uid)) {
    return { ok: false, status: 403, message: 'Invalid session' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: uid },
    select: { email: true },
  });
  if (!dbUser?.email) {
    return { ok: false, status: 403, message: 'User not found' };
  }

  const agent = await prisma.agent.findFirst({
    where: { email: { equals: dbUser.email, mode: 'insensitive' } },
    select: { agentId: true },
  });
  if (!agent?.agentId) {
    return { ok: false, status: 403, message: 'No agent profile for this user' };
  }

  const call = await prisma.callRecord.findUnique({
    where: { id: callRecordId },
    select: { agentId: true },
  });
  if (!call) {
    return { ok: false, status: 404, message: 'Call record not found' };
  }

  if (call.agentId === agent.agentId) {
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Not allowed to access this call transcript' };
}
