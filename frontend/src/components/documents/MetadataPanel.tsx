/**
 * MetadataPanel — displays AI-extracted structured metadata as clean cards.
 * Formats values intelligently (dates, amounts, lists).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Database, AlertCircle } from 'lucide-react';
import { documentService } from '@/services/documentService';

interface Props {
  documentId: string;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function MetaCard({ label, value }: { label: string; value: unknown }) {
  const formatted = formatValue(value);
  if (!formatted || formatted === '—') return null;
  return (
    <div className="rounded-xl border border-surface-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-surface-700 dark:bg-surface-800">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-surface-400">{label}</p>
      <p className="break-words text-sm font-semibold text-surface-900 dark:text-surface-100">
        {formatted}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl border border-surface-100 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
          <div className="h-2.5 w-1/3 rounded bg-surface-200 dark:bg-surface-700 mb-2" />
          <div className="h-4 w-2/3 rounded bg-surface-200 dark:bg-surface-700" />
        </div>
      ))}
    </div>
  );
}

export function MetadataPanel({ documentId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-metadata', documentId],
    queryFn: () => documentService.getAIMetadata(documentId),
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-surface-400" />
        <p className="text-sm text-surface-500">Failed to load metadata.</p>
      </div>
    );
  }

  if (!data.ai_metadata || Object.keys(data.ai_metadata).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
          <Database className="h-8 w-8 text-surface-400" />
        </div>
        <div>
          <p className="font-semibold text-surface-800 dark:text-surface-200">No Metadata Yet</p>
          <p className="mt-1 text-sm text-surface-500">
            {data.ai_error
              ? data.ai_error
              : 'AI metadata extraction will appear here after processing completes.'}
          </p>
        </div>
      </div>
    );
  }

  const entries = Object.entries(data.ai_metadata).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="metadata"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Category header */}
        {data.category && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Fields extracted for <span className="font-semibold text-surface-800 dark:text-surface-200">{data.category}</span>
            </p>
            {data.ai_confidence != null && (
              <span className="text-xs text-surface-400">
                {data.ai_confidence.toFixed(0)}% confidence
              </span>
            )}
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <MetaCard key={key} label={formatKey(key)} value={value} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
