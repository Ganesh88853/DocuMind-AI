/**
 * SearchResultCard — displays a single semantic search result.
 * Shows: category badge, confidence ring, summary, tags, match explanation, quick actions.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText, File, Star, Calendar, Eye,
  Download, CheckCircle2, Sparkles, Hash,
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import type { SearchResult } from '@/types/search';

interface Props {
  result: SearchResult;
  index: number;
}

const CONF_COLOR = (pct: number) =>
  pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
  pct >= 55 ? 'text-amber-500 dark:text-amber-400' :
              'text-rose-500 dark:text-rose-400';

const CONF_BG = (pct: number) =>
  pct >= 80 ? 'from-emerald-500 to-teal-500' :
  pct >= 55 ? 'from-amber-400 to-orange-400' :
              'from-rose-400 to-pink-500';

const CHIP_COLORS = [
  'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  'bg-accent-100 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
];

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  if (e === '.pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (e.includes('doc')) return <FileText className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-surface-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function SearchResultCard({ result, index }: Props) {
  const navigate = useNavigate();
  const pct = result.confidence_pct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-brand-700"
    >
      {/* Confidence accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${CONF_BG(pct)} rounded-l-2xl`}
      />

      <div className="flex items-start gap-4 p-5 pl-6">
        {/* File icon */}
        <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-100 dark:border-surface-700">
          <FileIcon ext={result.file_extension} />
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="cursor-pointer truncate font-semibold text-surface-900 group-hover:text-brand-600 dark:text-surface-100 dark:group-hover:text-brand-400 transition-colors"
                onClick={() => navigate(`/dashboard/documents/${result.document_id}`)}
              >
                {result.original_filename}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {result.category && (
                  <span className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                    {result.category}
                  </span>
                )}
                {result.is_favorite && (
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                )}
                <span className="text-xs text-surface-400">{formatBytes(result.file_size)}</span>
                <span className="flex items-center gap-1 text-xs text-surface-400">
                  <Calendar className="h-3 w-3" />
                  {timeAgo(result.created_at)}
                </span>
              </div>
            </div>

            {/* Confidence badge */}
            <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
              <div className={`text-lg font-bold ${CONF_COLOR(pct)}`}>{pct}%</div>
              <div className="text-[10px] text-surface-400 uppercase tracking-wide">match</div>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <p className="mt-2.5 text-sm leading-relaxed text-surface-600 dark:text-surface-300 line-clamp-2">
              {result.summary}
            </p>
          )}

          {/* Match explanation */}
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/30 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-brand-500" />
            <p className="text-xs text-brand-700 dark:text-brand-300 leading-relaxed">
              {result.match_explanation}
            </p>
          </div>

          {/* Tags */}
          {result.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.tags.slice(0, 6).map((tag, i) => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${CHIP_COLORS[i % CHIP_COLORS.length]}`}
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-surface-100 dark:border-surface-800">
            <button
              id={`view-result-${result.document_id}`}
              onClick={() => navigate(`/dashboard/documents/${result.document_id}`)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
            <button
              id={`download-result-${result.document_id}`}
              onClick={async () => {
                await documentService.downloadFile(result.document_id, result.original_filename);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>

            <div className="ml-auto">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
