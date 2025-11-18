/**
 * API response type definitions
 * Standard response formats for all API endpoints
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    animeRecommendations?: Array<{
      animeId: number;
      title: string;
      score: number;
    }>;
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  includeAnimeContext?: boolean;
}

export interface ChatResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
  streaming?: boolean;
}

// Chat history response
export interface ChatHistoryResponse {
  success: boolean;
  messages?: ChatMessage[];
  total?: number;
  error?: string;
}

// AniList API key management
export interface ApiKeyRequest {
  apiKey: string;
  storePermanently: boolean; // true = store encrypted in DB, false = session only
}

export interface ApiKeyResponse {
  success: boolean;
  stored?: boolean;
  error?: string;
}

// Sync request/response
export interface SyncRequest {
  force?: boolean; // Force full sync even if recently synced
  username?: string; // AniList username (for public profiles)
  userId?: number; // AniList user ID (for public profiles)
}

export interface SyncResponse {
  success: boolean;
  synced?: number; // Number of anime synced
  error?: string;
  sourceUsername?: string; // Username of the synced profile
  sourceUserId?: number; // User ID of the synced profile
}

