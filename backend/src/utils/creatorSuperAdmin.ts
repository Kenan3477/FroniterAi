import type { PrismaClient } from '@prisma/client';

/**
 * Email(s) that must always have SUPER_ADMIN (platform creator).
 * Override with OMNIVOX_CREATOR_EMAILS=comma@separated,list
 */
export function getCreatorEmailsNormalized(): string[] {
  const raw = process.env.OMNIVOX_CREATOR_EMAILS?.trim();
  if (raw) {
    return [...new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))];
  }
  return ['ken@simpleemails.co.uk'];
}

export function isCreatorEmail(email: string | null | undefined): boolean {
  const e = (email || '').trim().toLowerCase();
  if (!e) return false;
  return getCreatorEmailsNormalized().includes(e);
}

/**
 * If this user is the designated creator but not SUPER_ADMIN yet, promote in DB.
 * Returns the role that should be used for JWT and req.user (may differ from DB before update).
 */
export async function resolveCreatorSuperAdminRole(
  prisma: PrismaClient,
  args: { id: number; email: string | null | undefined; role: string },
): Promise<string> {
  if (!isCreatorEmail(args.email)) {
    return args.role;
  }
  if (args.role === 'SUPER_ADMIN') {
    return 'SUPER_ADMIN';
  }
  try {
    await prisma.user.updateMany({
      where: { id: args.id, role: { not: 'SUPER_ADMIN' } },
      data: { role: 'SUPER_ADMIN' },
    });
    console.log(`✅ Promoted creator ${args.email} to SUPER_ADMIN (was ${args.role})`);
    return 'SUPER_ADMIN';
  } catch (err) {
    console.error('❌ Failed to promote creator to SUPER_ADMIN:', err);
    return args.role;
  }
}
