/**
 * Search types for Milestone 6 — Semantic Document Search.
 */

export interface SearchFilters {
  category?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  favorites_only?: boolean;
  file_type?: string;
  status?: string;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  page?: number;
  page_size?: number;
}

export interface SearchResultTag {
  id: string;
  name: string;
}

export interface SearchResult {
  document_id: string;
  original_filename: string;
  file_extension: string;
  file_size: number;
  category: string | null;
  subcategory: string | null;
  summary: string | null;
  ai_confidence: number | null;
  tags: SearchResultTag[];
  is_favorite: boolean;
  created_at: string;
  status: string;
  // Search-specific
  semantic_score: number;
  final_score: number;
  confidence_pct: number;
  match_explanation: string;
  ai_metadata: Record<string, unknown> | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: SearchResult[];
  search_time_ms: number;
}

export interface SearchSuggestionsResponse {
  recent: string[];
  categories: string[];
  tags: string[];
}
