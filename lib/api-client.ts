/**
 * API Client Utility
 *
 * Handles basePath prefix for internal API routes
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Constructs full API URL with basePath prefix
 * @param path - API route path (e.g., '/api/workspace/state')
 * @returns Full URL with basePath prefix
 */
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * Fetch wrapper that automatically applies basePath
 * @param path - API route path
 * @param init - Fetch options
 * @returns Fetch promise
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
