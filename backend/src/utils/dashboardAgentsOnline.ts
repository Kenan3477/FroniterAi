import type { PrismaClient } from '@prisma/client';

/**
 * Count agents shown as "online" on the executive dashboard.
 * Must not count orphan `agents` rows (auto-created, tests, stale AVAILABLE).
 * Scope: same organization as the viewer when `organizationId` is set; otherwise
 * agents whose email matches any active user.
 */
export async function countAgentsOnlineForDashboard(
  prisma: PrismaClient,
  viewer: { organizationId: string | null | undefined },
): Promise<number> {
  const base = {
    status: { equals: 'AVAILABLE', mode: 'insensitive' as const },
    isLoggedIn: true,
  };

  if (viewer.organizationId) {
    const users = await prisma.user.findMany({
      where: { organizationId: viewer.organizationId, isActive: true },
      select: { email: true },
    });
    const emails = [...new Set(users.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean))];
    if (!emails.length) return 0;
    return prisma.agent.count({
      where: {
        ...base,
        OR: emails.map((e) => ({
          email: { equals: e, mode: 'insensitive' as const },
        })),
      },
    });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { email: true },
  });
  const emails = [...new Set(users.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) return 0;

  return prisma.agent.count({
    where: {
      ...base,
      OR: emails.map((e) => ({
        email: { equals: e, mode: 'insensitive' as const },
      })),
    },
  });
}
