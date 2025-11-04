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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

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
  async getSessions(botId: string, userId: number): Promise<SessionsResponse> {
    const response = await fetch(`${API_BASE_URL}/sessions/${botId}/${userId}`);
    return handleResponse<SessionsResponse>(response);
  },

  /**
   * Get messages from a specific session
   */
  async getMessages(sessionUuid: string): Promise<MessagesResponse> {
    const response = await fetch(`${API_BASE_URL}/messages/${sessionUuid}`);
    return handleResponse<MessagesResponse>(response);
  },

  /**
   * Create a new session (archives current one)
   */
  async createNewSession(
    request: NewSessionRequest
  ): Promise<NewSessionResponse> {
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
