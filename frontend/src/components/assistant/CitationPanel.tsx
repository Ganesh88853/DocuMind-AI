/**
 * CitationPanel — slide-in panel showing source documents for an answer.
 * Shows document name, relevance score, and OCR excerpt.
 * Links to the document detail page.
 */

import { X, FileText, ExternalLink, BarChart2 } from 'lucide-react';
import type { Citation } from '@/types/assistant';
import { Link } from 'react-router-dom';

interface Props {
  citations: Citation[];
  onClose: () => void;
}

function RelevanceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
    : pct >= 40 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
    : 'text-surface-500 bg-surface-100 dark:bg-surface-800 dark:text-surface-400';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <BarChart2 className="h-3 w-3" />
      {pct}% match
    </span>
  );
}

export function CitationPanel({ citations, onClose }: Props) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-500" />
          <span className="font-semibold text-surface-800 dark:text-surface-200">
            Sources ({citations.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Citation cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {citations.map((c) => (
          <div
            key={c.document_id}
            className="rounded-xl border border-surface-100 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800"
          >
            {/* Doc header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                    {c.filename}
                  </p>
                  <RelevanceBadge score={c.relevance_score} />
                </div>
              </div>

              <Link
                to={`/dashboard/documents`}
                className="shrink-0 rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-700"
                title="Open document"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Excerpt */}
            {c.excerpt && (
              <div className="mt-2.5 rounded-lg bg-white p-2.5 text-xs leading-relaxed text-surface-600 dark:bg-surface-900 dark:text-surface-400">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
                  Excerpt
                </p>
                <p className="line-clamp-4">{c.excerpt}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
