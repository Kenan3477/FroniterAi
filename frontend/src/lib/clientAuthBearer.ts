/**
 * Bearer token for browser-side API calls (localStorage; httpOnly cookies are not readable).
 */
export function getClientAuthBearer(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('authToken') ||
    localStorage.getItem('omnivox_token') ||
    ''
  );
}
