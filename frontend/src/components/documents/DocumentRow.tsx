/**
 * DocumentRow — horizontal list row for list-view display of a document.
 */

import { useNavigate } from 'react-router-dom';
import { Star, Trash2, Download, Eye, FileText, Image, File } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/documentService';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { Document } from '@/types/document';

interface Props {
  document: Document;
}

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  if (['.png', '.jpg', '.jpeg'].includes(e)) return <Image className="h-5 w-5 text-violet-500" />;
  if (['.pdf'].includes(e)) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-blue-500" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DocumentRow({ document }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const favMutation = useMutation({
    mutationFn: () => documentService.toggleFavorite(document.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentService.delete(document.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  return (
    <div
      onClick={() => navigate(`/dashboard/documents/${document.id}`)}
      className="group flex cursor-pointer items-center gap-4 rounded-xl border border-surface-200 bg-white
                 px-4 py-3 shadow-sm transition-all hover:border-brand-300 hover:shadow-md
                 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-brand-600"
    >
      {/* Icon */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-50 dark:bg-surface-800">
        <FileIcon ext={document.file_extension} />
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
          {document.original_filename}
        </p>
        <p className="text-xs text-surface-500">
          {formatBytes(document.file_size)} · {formatDate(document.created_at)}
        </p>
      </div>

      {/* Status */}
      <DocumentStatusBadge status={document.status} />

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/documents/${document.id}`); }}
          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await documentService.downloadFile(document.id, document.original_filename);
          }}
          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); favMutation.mutate(); }}
          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-amber-500 dark:hover:bg-surface-800"
        >
          <Star className={`h-4 w-4 ${document.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${document.original_filename}"?`)) deleteMutation.mutate();
          }}
          className="rounded-lg p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
