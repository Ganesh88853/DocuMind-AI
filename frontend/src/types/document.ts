/**
 * TypeScript interfaces for the Document domain — Milestone 5.
 */

export type DocumentStatus =
  | 'UPLOADING' | 'READY' | 'PROCESSING' | 'FAILED' | 'ARCHIVED'
  | 'OCR_PROCESSING' | 'OCR_COMPLETED' | 'OCR_FAILED'
  | 'AI_PROCESSING' | 'COMPLETED';

export interface Document {
  id: string;
  owner_id: string;
  original_filename: string;
  file_extension: string;
  mime_type: string;
  file_size: number;
  category: string | null;
  subcategory: string | null;
  summary: string | null;
  ai_confidence: number | null;
  processed_at: string | null;
  ai_metadata: Record<string, unknown> | null;
  ai_error: string | null;
  description: string | null;
  is_favorite: boolean;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  favorites_only?: boolean;
}

export type ViewMode = 'grid' | 'list';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  document?: Document;
  error?: string;
}

// ── OCR types ────────────────────────────────────────────────────────────────

export interface OCRResult {
  document_id: string;
  status: DocumentStatus;
  extracted_text: string | null;
  total_pages: number | null;
  detected_language: string | null;
  processing_time: number | null;
  ocr_engine: string | null;
  error_message: string | null;
  created_at: string | null;
}

export interface ProcessingStatus {
  document_id: string;
  status: DocumentStatus;
  ocr_engine: string | null;
  processing_time: number | null;
  error_message: string | null;
  has_text: boolean;
}

// ── AI types (Milestone 5) ────────────────────────────────────────────────────

export interface TagResponse {
  id: string;
  name: string;
}

export interface AISummaryResponse {
  document_id: string;
  status: DocumentStatus;
  category: string | null;
  subcategory: string | null;
  summary: string | null;
  ai_confidence: number | null;
  processed_at: string | null;
  tags: TagResponse[];
  ai_error: string | null;
}

export interface AIMetadataResponse {
  document_id: string;
  status: DocumentStatus;
  category: string | null;
  ai_metadata: Record<string, unknown> | null;
  ai_confidence: number | null;
  ai_error: string | null;
}

export interface AITagsResponse {
  document_id: string;
  tags: TagResponse[];
}

// ── Status helpers ────────────────────────────────────────────────────────────

export function isProcessing(status: DocumentStatus): boolean {
  return (
    status === 'UPLOADING' ||
    status === 'OCR_PROCESSING' ||
    status === 'AI_PROCESSING'
  );
}

export function isOCRDone(status: DocumentStatus): boolean {
  return (
    status === 'OCR_COMPLETED' ||
    status === 'OCR_FAILED' ||
    status === 'AI_PROCESSING' ||
    status === 'COMPLETED'
  );
}

export function isAIDone(status: DocumentStatus): boolean {
  return status === 'COMPLETED';
}

export function isAIProcessing(status: DocumentStatus): boolean {
  return status === 'AI_PROCESSING';
}
