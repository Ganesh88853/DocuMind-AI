// assistantService.ts — API calls for the AI Document Assistant

import { apiClient } from './api';
import type {
  ChatRequest,
  ChatResponse,
  ConversationDetail,
  ConversationListResponse,
  ConversationSummary,
  RenameRequest,
} from '@/types/assistant';

const BASE = '/api/v1/assistant';

export const assistantService = {
  /** Send a message and get an AI response.
   *  Timeout is 120s — Gemini can take up to ~90s when retrying on 503/quota errors.
   */
  chat: async (body: ChatRequest): Promise<ChatResponse> => {
    const res = await apiClient.post<ChatResponse>(`${BASE}/chat`, body, {
      timeout: 120_000, // 2 minutes — overrides the 15s default
    });
    return res.data;
  },

  /** List all conversations for the current user */
  listConversations: async (): Promise<ConversationListResponse> => {
    const res = await apiClient.get<ConversationListResponse>(`${BASE}/conversations`);
    return res.data;
  },

  /** Get a specific conversation with all messages */
  getConversation: async (id: string): Promise<ConversationDetail> => {
    const res = await apiClient.get<ConversationDetail>(`${BASE}/conversations/${id}`);
    return res.data;
  },

  /** Delete a conversation */
  deleteConversation: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`${BASE}/conversations/${id}`);
    return res.data;
  },

  /** Rename a conversation */
  renameConversation: async (id: string, body: RenameRequest): Promise<ConversationSummary> => {
    const res = await apiClient.post<ConversationSummary>(
      `${BASE}/conversations/${id}/rename`,
      body,
    );
    return res.data;
  },
};
