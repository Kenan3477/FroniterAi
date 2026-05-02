/**
 * Central flags for dangerous / debug-only HTTP routes.
 * Production never exposes them without explicit auth on each route.
 */

export function isProductionNodeEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * When true, optional debug-style routes (e.g. extra logging endpoints) may be registered.
 * Never enable in production.
 */
export function allowPublicDebugRoutes(): boolean {
  if (isProductionNodeEnv()) return false;
  return process.env.OMNIVOX_ALLOW_PUBLIC_DEBUG_ROUTES === 'true';
}

/**
 * Shared secret for maintenance-only HTTP endpoints (emergency unlock, etc.).
 * If unset, those endpoints respond 404 so they cannot be abused anonymously.
 */
export function getMaintenanceSecret(): string | undefined {
  const s = process.env.OMNIVOX_MAINTENANCE_SECRET?.trim();
  return s || undefined;
}

export function maintenanceSecretMatches(req: {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body?: Record<string, unknown>;
}): boolean {
  const secret = getMaintenanceSecret();
  if (!secret) return false;
  const headerVal = req.headers['x-omnivox-maintenance-secret'];
  const fromHeader = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  const fromQuery =
    typeof req.query.secret === 'string' ? req.query.secret : undefined;
  const fromBody =
    req.body && typeof req.body.maintenanceSecret === 'string'
      ? req.body.maintenanceSecret
      : undefined;
  const provided = fromHeader || fromQuery || fromBody;
  return typeof provided === 'string' && provided.length > 0 && provided === secret;
}
