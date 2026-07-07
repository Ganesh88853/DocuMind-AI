/**
 * Document API service — all HTTP calls for the document domain.
 */

import apiClient from './api';
import type {
  Document,
  DocumentListParams,
  DocumentListResponse,
  OCRResult,
  ProcessingStatus,
  AISummaryResponse,
  AIMetadataResponse,
  AITagsResponse,
} from '@/types/document';

export const documentService = {
  async upload(file: File, onProgress?: (progress: number) => void): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<Document>('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return data;
  },

  async list(params?: DocumentListParams): Promise<DocumentListResponse> {
    const { data } = await apiClient.get<DocumentListResponse>('/api/v1/documents', { params });
    return data;
  },

  async getById(id: string): Promise<Document> {
    const { data } = await apiClient.get<Document>(`/api/v1/documents/${id}`);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/documents/${id}`);
  },

  async toggleFavorite(id: string): Promise<Document> {
    const { data } = await apiClient.patch<Document>(`/api/v1/documents/${id}/favorite`);
    return data;
  },

  /**
   * Download a document file with authentication.
   *
   * Uses Axios (which carries the Authorization: Bearer header) to fetch the
   * file as a binary blob, then creates a temporary object URL and triggers
   * a programmatic browser save-as — so the auth token is always included.
   *
   * NOTE: A plain <a href="…"> anchor cannot send auth headers because the
   * browser navigates directly to the URL — that is why the endpoint returned
   * 403 "Not authenticated" with the old implementation.
   */
  async downloadFile(id: string, filename: string): Promise<void> {
    const response = await apiClient.get(`/api/v1/documents/${id}/download`, {
      responseType: 'blob',
    });

    // Prefer filename from Content-Disposition header if the server provides it
    const disposition = response.headers['content-disposition'] as string | undefined;
    let downloadName = filename;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'"\n;]*)\1/);
      if (match?.[2]) downloadName = match[2].trim();
    }

    // Create a temporary blob URL and trigger the browser's native save dialog
    const blobUrl = URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();

    // Clean up to avoid memory leaks
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  },

  // ── OCR endpoints ──────────────────────────────────────────────────────────

  async getOCRText(id: string): Promise<OCRResult> {
    const { data } = await apiClient.get<OCRResult>(`/api/v1/documents/${id}/text`);
    return data;
  },

  async getProcessingStatus(id: string): Promise<ProcessingStatus> {
    const { data } = await apiClient.get<ProcessingStatus>(`/api/v1/documents/${id}/processing-status`);
    return data;
  },

  // ── AI endpoints (Milestone 5) ─────────────────────────────────────────────

  async getAISummary(id: string): Promise<AISummaryResponse> {
    const { data } = await apiClient.get<AISummaryResponse>(`/api/v1/documents/${id}/summary`);
    return data;
  },

  async getAIMetadata(id: string): Promise<AIMetadataResponse> {
    const { data } = await apiClient.get<AIMetadataResponse>(`/api/v1/documents/${id}/metadata`);
    return data;
  },

  async getAITags(id: string): Promise<AITagsResponse> {
    const { data } = await apiClient.get<AITagsResponse>(`/api/v1/documents/${id}/tags`);
    return data;
  },

  async reprocessAI(id: string): Promise<void> {
    await apiClient.post(`/api/v1/documents/${id}/reprocess-ai`);
  },
};
