/**
 * DocumentStatusBadge — color-coded pill for every document lifecycle state.
 * Updated in Milestone 4 to cover all OCR and AI processing states.
 */

import type { DocumentStatus } from '@/types/document';

interface Props {
  status: DocumentStatus;
  size?: 'sm' | 'md';
}

const config: Record<DocumentStatus, { label: string; classes: string; pulse?: boolean }> = {
  // Upload phase
  UPLOADING:      { label: 'Uploading',       classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', pulse: true },
  READY:          { label: 'Ready',            classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  PROCESSING:     { label: 'Processing',       classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', pulse: true },
  FAILED:         { label: 'Failed',           classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  ARCHIVED:       { label: 'Archived',         classes: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400' },

  // OCR phase (Milestone 4)
  OCR_PROCESSING: { label: 'OCR Processing',   classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400', pulse: true },
  OCR_COMPLETED:  { label: 'OCR Done',         classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
  OCR_FAILED:     { label: 'OCR Failed',       classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },

  // AI phase (future)
  AI_PROCESSING:  { label: 'AI Processing',    classes: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400', pulse: true },
  COMPLETED:      { label: 'Completed',        classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

export function DocumentStatusBadge({ status, size = 'sm' }: Props) {
  const cfg = config[status] ?? config.READY;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${cfg.classes} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}
