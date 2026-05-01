/**
 * Normalize role strings from API/JWT for UI checks (case, spacing, legacy values).
 */
export function normalizeAppRole(role: string | null | undefined): string | null {
  if (role == null || typeof role !== 'string') return null;
  const t = role.trim();
  if (!t) return null;
  const u = t.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (u === 'SUPERADMIN' || u === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  return u;
}
