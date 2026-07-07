/**
 * UploadPage — drag-and-drop document upload page with recent uploads.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Info } from 'lucide-react';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { DocumentRow } from '@/components/documents/DocumentRow';
import { DocumentSkeleton } from '@/components/documents/DocumentSkeleton';
import { documentService } from '@/services/documentService';

export default function UploadPage() {
  const navigate = useNavigate();

  // Load recent docs (latest 5) to show below the uploader
  const { data, isLoading } = useQuery({
    queryKey: ['documents', { page: 1, recent: true }],
    queryFn: () => documentService.list({ page: 1, page_size: 5 }),
    staleTime: 10_000,
    refetchInterval: 5_000,   // auto-refresh to pick up newly uploaded docs
  });

  const recent = data?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/documents')}
        className="mb-6 flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-surface-900 dark:hover:text-surface-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          Upload Documents
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Add PDFs, Word documents, or images to your library.
        </p>
      </motion.div>

      {/* Uploader */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <DocumentUploader />
      </motion.div>

      {/* Info box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30"
      >
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Uploaded files are stored securely. Future milestones will add AI-powered OCR, 
          categorization, and semantic search to your documents.
        </p>
      </motion.div>

      {/* Recent uploads */}
      {(isLoading || recent.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10"
        >
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Recent Uploads
            </h2>
          </div>

          {isLoading ? (
            <DocumentSkeleton count={3} mode="list" />
          ) : (
            <div className="space-y-2">
              {recent.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
