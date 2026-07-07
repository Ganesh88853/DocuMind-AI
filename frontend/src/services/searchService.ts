/**
 * Search API service — all HTTP calls for semantic search.
 */

import apiClient from './api';
import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestionsResponse,
} from '@/types/search';

export const searchService = {
  async search(request: SearchRequest): Promise<SearchResponse> {
    const { data } = await apiClient.post<SearchResponse>('/api/v1/search', request);
    return data;
  },

  async getSuggestions(q?: string): Promise<SearchSuggestionsResponse> {
    const { data } = await apiClient.get<SearchSuggestionsResponse>('/api/v1/search/suggestions', {
      params: q ? { q } : {},
    });
    return data;
  },

  async clearHistory(): Promise<void> {
    await apiClient.delete('/api/v1/search/history');
  },
};
