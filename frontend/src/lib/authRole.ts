/**
 * Normalize role strings from API/JWT for UI checks (case, spacing, legacy values).
 * Coerces non-strings (some APIs return numeric role ids) so nav filtering never goes empty.
 */
export function normalizeAppRole(role: unknown): string | null {
  if (role == null) return null;
  const t = String(role).trim();
  if (!t) return null;
  const u = t.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (u === 'SUPERADMIN' || u === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (u === 'MANAGER') return 'MANAGER';
  return u;
}
