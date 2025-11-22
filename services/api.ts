/**
 * API Service Layer
 *
 * Clean abstraction for all backend communication.
 * Handles HTTP requests, error handling, and response transformation.
 */

import type {
  SessionsResponse,
  MessagesResponse,
  NewSessionRequest,
  NewSessionResponse,
  SwitchSessionRequest,
  SwitchSessionResponse,
  ApiError,
} from '@/types';
import useTabStore from '@/store/tabStore';

/**
 * Get the bot server URL from the store
 * Falls back to localhost if store is not initialized
 */
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use env var or default
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
  }

  // Client-side: get from store
  const botServerUrl = useTabStore.getState().botServerUrl;
  return botServerUrl || 'http://localhost:3010';
}

// ============================================================================
// Error Handling
// ============================================================================

class ApiException extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = {
      message: `API Error: ${response.status} ${response.statusText}`,
      code: String(response.status),
    };

    try {
      const errorData = await response.json();
      error.details = errorData;
      error.message = errorData.error || error.message;
    } catch {
      // Response body not JSON, use default error message
    }

    throw new ApiException(error.message, response.status, error.details);
  }

  return response.json();
}

// ============================================================================
// Session API
// ============================================================================

export const sessionApi = {
  /**
   * Get session history for a bot + user
   */
  async getSessions(botId: string, userId: string, workspacePath?: string): Promise<SessionsResponse> {
    const API_BASE_URL = getApiBaseUrl();
    const url = workspacePath
      ? `${API_BASE_URL}/sessions/${botId}/${userId}?workspace=${encodeURIComponent(workspacePath)}`
      : `${API_BASE_URL}/sessions/${botId}/${userId}`;
    const response = await fetch(url);
    return handleResponse<SessionsResponse>(response);
  },

  /**
   * Get messages from a specific session
   */
  async getMessages(sessionUuid: string): Promise<MessagesResponse> {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/messages/${sessionUuid}`);
    return handleResponse<MessagesResponse>(response);
  },

  /**
   * Create a new session (archives current one)
   */
  async createNewSession(
    request: NewSessionRequest
  ): Promise<NewSessionResponse> {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/new-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<NewSessionResponse>(response);
  },

  /**
   * Switch to a different session
   */
  async switchSession(
    request: SwitchSessionRequest
  ): Promise<SwitchSessionResponse> {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/switch-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<SwitchSessionResponse>(response);
  },
};

// ============================================================================
// Health Check
// ============================================================================

export interface HealthResponse {
  status: string;
  bots: string[];
  uptime: number;
  pendingResponses: number;
}

export const healthApi = {
  async check(): Promise<HealthResponse> {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(response);
  },
};

// ============================================================================
// Export Everything
// ============================================================================

export const api = {
  session: sessionApi,
  health: healthApi,
};

export default api;
