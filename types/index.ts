/**
 * Core Types for Labcart
 *
 * Professional type definitions for the multi-bot chat application.
 * All data structures, API responses, and domain models defined here.
 */

// ============================================================================
// Domain Models
// ============================================================================

export interface Bot {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  role?: 'user' | 'assistant'; // For Claude API format
}

export interface Session {
  uuid: string;
  botId: string;
  userId: number;
  messageCount: number;
  createdAt: string;
  updatedAt?: string;
  endedAt?: string;
  isCurrent: boolean;
  reason?: string;
}

// Chat Tab (for bot conversations)
export interface ChatTab {
  type: 'chat';
  id: string; // Unique tab ID: `${botId}-${sessionUuid}`
  botId: string;
  botName: string;
  sessionUuid: string | null; // null for new/unsaved sessions
  messages: Message[];
  isLoading: boolean;
  lastActivity: number;
}

// File Tab (for code editing)
export interface FileTab {
  type: 'file';
  id: string; // Unique tab ID: `file-${filePath}`
  filePath: string;
  fileName: string;
  lastActivity: number;
}

// Unified Tab Type (discriminated union)
export type Tab = ChatTab | FileTab;

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SessionsResponse {
  currentSession: Session | null;
  history: Session[];
  totalSessions: number;
}

export interface MessagesResponse {
  sessionUuid: string;
  messages: Message[];
  messageCount: number;
}

export interface NewSessionRequest {
  botId: string;
  userId: number;
}

export interface NewSessionResponse {
  success: boolean;
  message: string;
}

export interface SwitchSessionRequest {
  botId: string;
  userId: number;
  sessionUuid: string;
}

export interface SwitchSessionResponse {
  success: boolean;
  currentSession: string;
  message: string;
}

export interface SendMessageRequest {
  botId: string;
  userId: number;
  message: string;
}

export interface BotMessageEvent {
  botId: string;
  userId: number;
  message: string;
  timestamp: number;
}

// ============================================================================
// Store State Types
// ============================================================================

export interface TabStore {
  // State
  tabs: Tab[];
  activeTabId: string | null;
  userId: number | null;
  hasInitialized: boolean;
  workspacePath: string | null;
  botServerUrl: string; // URL of the bot server to connect to

  // Chat Tab Actions
  addTab: (botId: string, botName: string, sessionUuid?: string) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabMessages: (tabId: string, messages: Message[]) => void;
  addMessageToTab: (tabId: string, message: Message) => void;
  setTabLoading: (tabId: string, isLoading: boolean) => void;
  setTabSessionUuid: (tabId: string, sessionUuid: string) => void;
  replaceTabSession: (botId: string, botName: string, sessionUuid: string | null, messages?: Message[]) => void;

  // File Tab Actions
  addFileTab: (filePath: string) => void;

  // Common Actions
  setUserId: (userId: number) => void;
  getActiveTab: () => Tab | null;
  validateTabs: () => Promise<void>;
  initializeDefaultTab: () => void;
  clearWorkspaceData: () => void;
  setWorkspacePath: (path: string) => void;
  setBotServerUrl: (url: string) => void;

  // Supabase Sync Actions
  loadWorkspaceState: (workspaceId: string) => Promise<void>;
  saveWorkspaceState: (workspaceId: string) => Promise<void>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
