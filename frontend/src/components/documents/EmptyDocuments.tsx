/**
 * EmptyDocuments — illustrated empty state for the documents page.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText } from 'lucide-react';

interface Props {
  hasSearch?: boolean;
}

export function EmptyDocuments({ hasSearch = false }: Props) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-950 dark:to-accent-950">
          <FileText className="h-12 w-12 text-brand-500 dark:text-brand-400" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 shadow-lg">
          <span className="text-sm font-bold text-white">0</span>
        </div>
      </div>

      <h3 className="mb-2 text-xl font-bold text-surface-900 dark:text-surface-100">
        {hasSearch ? 'No documents found' : 'No documents yet'}
      </h3>
      <p className="mb-8 max-w-sm text-sm text-surface-500 dark:text-surface-400">
        {hasSearch
          ? 'Try a different search term or clear the filter.'
          : 'Upload your first document to get started. Supports PDF, DOCX, DOC, PNG, JPG.'}
      </p>

      {!hasSearch && (
        <button
          onClick={() => navigate('/dashboard/upload')}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3
                     text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all
                     hover:shadow-brand-500/40 hover:scale-105 active:scale-95"
        >
          <Upload className="h-4 w-4" />
          Upload your first document
        </button>
      )}
    </motion.div>
  );
}
