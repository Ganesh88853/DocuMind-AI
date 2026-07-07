/**
 * DocumentCard — grid card displaying document metadata with actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Trash2, Eye, Download, FileText, Image, File } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/documentService';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { Document } from '@/types/document';

interface Props {
  document: Document;
}

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  if (['.png', '.jpg', '.jpeg'].includes(e))
    return <Image className="h-8 w-8 text-violet-500" />;
  if (['.pdf'].includes(e))
    return <FileText className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-blue-500" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function DocumentCard({ document }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const favMutation = useMutation({
    mutationFn: () => documentService.toggleFavorite(document.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentService.delete(document.id),
    onMutate: () => setDeleting(true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    onError: () => setDeleting(false),
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${document.original_filename}"?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: deleting ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={() => navigate(`/dashboard/documents/${document.id}`)}
      className="group relative cursor-pointer rounded-2xl border border-surface-200 bg-white p-4 shadow-sm
                 transition-all duration-200 hover:shadow-md hover:border-brand-300
                 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-brand-600"
    >
      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); favMutation.mutate(); }}
        className="absolute top-3 right-3 rounded-lg p-1.5 text-surface-400 transition-colors
                   hover:bg-surface-100 hover:text-amber-500 dark:hover:bg-surface-800"
        aria-label="Toggle favorite"
      >
        <Star
          className={`h-4 w-4 transition-colors ${document.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`}
        />
      </button>

      {/* Icon */}
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-50 dark:bg-surface-800">
        <FileIcon ext={document.file_extension} />
      </div>

      {/* Name */}
      <p className="mb-1 truncate pr-6 text-sm font-semibold text-surface-900 dark:text-surface-100">
        {document.original_filename}
      </p>

      {/* Meta */}
      <div className="mb-3 flex items-center gap-2 text-xs text-surface-500">
        <span>{formatBytes(document.file_size)}</span>
        <span>·</span>
        <span>{formatDate(document.created_at)}</span>
      </div>

      {/* Status */}
      <DocumentStatusBadge status={document.status} />

      {/* Hover actions */}
      <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-end gap-1
                      rounded-b-2xl bg-gradient-to-t from-white/90 px-3 pb-2 opacity-0 transition-all
                      duration-200 group-hover:translate-y-0 group-hover:opacity-100
                      dark:from-surface-900/90">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/documents/${document.id}`); }}
          className="rounded-lg p-1.5 text-surface-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950"
          aria-label="View details"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await documentService.downloadFile(document.id, document.original_filename);
          }}
          className="rounded-lg p-1.5 text-surface-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950"
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={handleDelete}
          className="rounded-lg p-1.5 text-surface-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
