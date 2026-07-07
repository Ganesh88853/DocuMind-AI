/**
 * SuggestedPrompts — empty state with example questions to click.
 * Shows when a new conversation has no messages yet.
 */

import { Sparkles } from 'lucide-react';

const PROMPTS = [
  { icon: '📋', text: 'What certificates do I have?' },
  { icon: '💼', text: 'Summarize my resume.' },
  { icon: '🔍', text: 'Find my tax documents.' },
  { icon: '📅', text: 'Which documents expire this year?' },
  { icon: '💰', text: 'List all invoices I have.' },
  { icon: '🆔', text: 'What is my passport expiry date?' },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Brand logo */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-200 dark:shadow-brand-900/30">
        <Sparkles className="h-8 w-8 text-white" />
      </div>

      <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
        Ask about your documents
      </h2>
      <p className="mt-2 max-w-sm text-sm text-surface-500">
        I'll answer your questions using only documents in your collection.
        Every answer includes citations.
      </p>

      {/* Prompt chips */}
      <div className="mt-8 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <button
            key={p.text}
            onClick={() => onSelect(p.text)}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-3 text-left text-sm font-medium text-surface-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-600 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
          >
            <span className="text-lg">{p.icon}</span>
            <span>{p.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
