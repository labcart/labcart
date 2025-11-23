/**
 * Proxy Client for Bot Server HTTP Requests
 *
 * Routes all HTTP requests through the stable WebSocket proxy at ide-ws.labcart.io
 * instead of directly to the dynamic Cloudflare tunnel URL.
 */

const PROXY_BASE_URL = 'https://ide-ws.labcart.io';

/**
 * Build a proxy URL for a bot server endpoint
 * @param endpoint - Bot server endpoint path (e.g., '/discover-workspaces')
 * @param userId - User ID for routing
 * @returns Full proxy URL
 */
export function buildProxyUrl(endpoint: string, userId: string): string {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${PROXY_BASE_URL}/proxy${path}?userId=${encodeURIComponent(userId)}`;
}

/**
 * Fetch from bot server through proxy
 * @param endpoint - Bot server endpoint
 * @param userId - User ID
 * @param options - Fetch options
 * @returns Fetch promise
 */
export async function proxyFetch(
  endpoint: string,
  userId: string,
  options?: RequestInit
): Promise<Response> {
  const url = buildProxyUrl(endpoint, userId);
  return fetch(url, options);
}
