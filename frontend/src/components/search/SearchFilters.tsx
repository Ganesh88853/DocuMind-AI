/**
 * SearchFilters — collapsible filter sidebar for search results.
 * Supports category, tags, date range, favorites, file type, and status.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, X, Star, Hash } from 'lucide-react';
import type { SearchFilters as SearchFiltersType } from '@/types/search';
import type { SearchSuggestionsResponse } from '@/types/search';

interface Props {
  filters: SearchFiltersType;
  onChange: (filters: SearchFiltersType) => void;
  suggestions?: SearchSuggestionsResponse;
}

const FILE_TYPES = ['pdf', 'docx', 'doc', 'png', 'jpg'];

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-surface-100 dark:border-surface-800 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        className="flex w-full items-center justify-between text-sm font-semibold text-surface-700 dark:text-surface-200 mb-3"
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SearchFilters({ filters, onChange, suggestions }: Props) {
  const activeCount = [
    filters.category,
    filters.tags?.length,
    filters.date_from,
    filters.date_to,
    filters.favorites_only,
    filters.file_type,
    filters.status,
  ].filter(Boolean).length;

  const update = (patch: Partial<SearchFiltersType>) =>
    onChange({ ...filters, ...patch });

  const toggleTag = (tag: string) => {
    const current = filters.tags ?? [];
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    update({ tags: next.length > 0 ? next : undefined });
  };

  const clear = () =>
    onChange({});

  return (
    <div className="rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 p-4 sticky top-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1 text-xs text-surface-400 hover:text-rose-500 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Category */}
      {suggestions?.categories && suggestions.categories.length > 0 && (
        <FilterSection label="Category">
          <div className="space-y-1.5">
            {suggestions.categories.map(cat => (
              <button
                key={cat}
                onClick={() => update({ category: filters.category === cat ? undefined : cat })}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  filters.category === cat
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    filters.category === cat ? 'bg-brand-500' : 'bg-surface-300 dark:bg-surface-600'
                  }`}
                />
                {cat}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Tags */}
      {suggestions?.tags && suggestions.tags.length > 0 && (
        <FilterSection label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {suggestions.tags.map(tag => {
              const active = filters.tags?.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-surface-800 dark:text-surface-400'
                  }`}
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tag}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* File type */}
      <FilterSection label="File Type">
        <div className="flex flex-wrap gap-1.5">
          {FILE_TYPES.map(ft => {
            const active = filters.file_type === ft;
            return (
              <button
                key={ft}
                onClick={() => update({ file_type: active ? undefined : ft })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase transition-all ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'border-surface-200 text-surface-500 hover:border-brand-300 dark:border-surface-700 dark:text-surface-400'
                }`}
              >
                {ft}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Favorites */}
      <FilterSection label="More">
        <button
          onClick={() => update({ favorites_only: !filters.favorites_only })}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            filters.favorites_only
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              : 'text-surface-600 hover:bg-surface-50 dark:text-surface-400'
          }`}
        >
          <Star
            className={`h-4 w-4 ${filters.favorites_only ? 'fill-amber-400 text-amber-400' : ''}`}
          />
          Favorites only
        </button>
      </FilterSection>
    </div>
  );
}
