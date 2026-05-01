import type { NextRequest } from 'next/server';

/**
 * Bearer token for server-side API routes (browser may send only cookies).
 */
export function getBearerFromNextRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return (
    request.cookies.get('session_token')?.value ||
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('omnivox_token')?.value ||
    request.cookies.get('auth_token')?.value ||
    request.cookies.get('access-token')?.value ||
    request.cookies.get('token')?.value ||
    undefined
  );
}
