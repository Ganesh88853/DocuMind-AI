/**
 * SearchPage — AI-powered semantic document search.
 * Milestone 6: natural language queries, filter sidebar, result cards with explanations.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Search, Sparkles, X, Clock, TrendingUp, Hash,
  FileText, Brain, Zap, ChevronRight, SlidersHorizontal,
  Timer,
} from 'lucide-react';
import { searchService } from '@/services/searchService';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { SearchFilters as SearchFilterPanel } from '@/components/search/SearchFilters';
import { SearchSkeleton, FilterSkeleton } from '@/components/search/SearchSkeleton';
import type { SearchFilters, SearchResult } from '@/types/search';

const EXAMPLE_QUERIES = [
  'Show my internship resume',
  'Find Python certificates',
  'Show invoices from 2024',
  'Government identity documents',
  'Medical reports',
];

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-950/50 dark:to-accent-950/50">
        <Search className="h-9 w-9 text-brand-400" />
      </div>
      <h3 className="text-lg font-bold text-surface-800 dark:text-surface-100">
        No results for "{query}"
      </h3>
      <p className="mt-2 max-w-xs text-sm text-surface-500">
        Try different keywords, or check that your documents have been fully processed by AI.
      </p>
      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-surface-400">Try these instead:</p>
        {EXAMPLE_QUERIES.slice(0, 3).map(q => (
          <p key={q} className="text-sm text-brand-600 dark:text-brand-400">{q}</p>
        ))}
      </div>
    </motion.div>
  );
}

function NoQueryState({ onExample }: { onExample: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-xl">
        <Brain className="h-12 w-12 text-white" />
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 shadow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
        AI Semantic Search
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-surface-500">
        Search your documents with natural language. The AI understands meaning, not just keywords.
      </p>

      <div className="mt-8 w-full max-w-lg">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400 text-center">
          Example queries
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXAMPLE_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => onExample(q)}
              className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-3 text-left text-sm text-surface-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300 group"
            >
              <ChevronRight className="h-4 w-4 text-brand-400 group-hover:translate-x-0.5 transition-transform" />
              {q}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function SearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions (fetched once + on query change)
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions'],
    queryFn: () => searchService.getSuggestions(),
    staleTime: 30_000,
  });

  // Main search mutation
  const { mutate: runSearch, data: searchData, isPending, reset } = useMutation({
    mutationFn: (q: string) =>
      searchService.search({ query: q, filters, page, page_size: 10 }),
  });

  // Debounced search
  const triggerSearch = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      setActiveQuery(q.trim());
      setPage(1);
      runSearch(q.trim());
    },
    [runSearch, filters],
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      reset();
      setActiveQuery('');
      return;
    }
    debounceRef.current = setTimeout(() => triggerSearch(value), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    triggerSearch(inputValue);
    setShowSuggestions(false);
  };

  const selectSuggestion = (q: string) => {
    setInputValue(q);
    setShowSuggestions(false);
    triggerSearch(q);
    inputRef.current?.focus();
  };

  // Re-run search when filters or page changes (only if a query is already active)
  useEffect(() => {
    if (activeQuery) {
      runSearch(activeQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]); // intentionally excludes runSearch/activeQuery — we only want this to fire on filter/page changes

  // Cleanup debounce timer on unmount to avoid phantom searches after navigation
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);


  const clearSearch = () => {
    setInputValue('');
    setActiveQuery('');
    reset();
    setFilters({});
    inputRef.current?.focus();
  };

  const results: SearchResult[] = searchData?.results ?? [];
  const hasResults = results.length > 0;
  const hasSearched = !!activeQuery;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
          <span className="gradient-text">AI Semantic Search</span>
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Search using natural language — the AI understands meaning, not just keywords.
        </p>
      </motion.div>

      {/* ── Search Box ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6"
      >
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 opacity-0 group-focus-within:opacity-30 transition-opacity duration-300 blur-sm" />
            <div className="relative flex items-center rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-900 focus-within:border-brand-400 dark:focus-within:border-brand-600 transition-colors">
              <div className="flex h-14 w-14 items-center justify-center">
                {isPending ? (
                  <Zap className="h-5 w-5 animate-pulse text-brand-500" />
                ) : (
                  <Search className="h-5 w-5 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
                )}
              </div>
              <input
                ref={inputRef}
                id="semantic-search-input"
                type="text"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. Show my Python certificates, or Find 2024 invoices…"
                className="flex-1 bg-transparent py-4 text-sm text-surface-900 placeholder-surface-400 outline-none dark:text-surface-100"
              />
              <div className="flex items-center gap-2 pr-4">
                {inputValue && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    Object.values(filters).some(Boolean)
                      ? 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                      : 'border-surface-200 text-surface-500 hover:border-brand-300 dark:border-surface-700'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && !isPending && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-900"
            >
              {suggestions?.recent && suggestions.recent.length > 0 && (
                <div className="border-b border-surface-100 dark:border-surface-800 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
                    <Clock className="h-3 w-3" /> Recent
                  </p>
                  {suggestions.recent.slice(0, 5).map(q => (
                    <button
                      key={q}
                      onMouseDown={() => selectSuggestion(q)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5 text-surface-400" />
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {suggestions?.categories && suggestions.categories.length > 0 && (
                <div className="p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
                    <TrendingUp className="h-3 w-3" /> Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.categories.slice(0, 8).map(cat => (
                      <button
                        key={cat}
                        onMouseDown={() => selectSuggestion(cat)}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Main layout: filter sidebar + results ─────────────────────────── */}
      <div className="flex gap-6">

        {/* Filter sidebar */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 288 }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-shrink-0 overflow-hidden"
            >
              {!suggestions ? (
                <FilterSkeleton />
              ) : (
                <SearchFilterPanel
                  filters={filters}
                  onChange={setFilters}
                  suggestions={suggestions}
                />
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Results area */}
        <div className="min-w-0 flex-1">

          {/* Search meta (time + count) */}
          {hasSearched && searchData && !isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex items-center justify-between"
            >
              <p className="text-sm text-surface-500">
                {searchData.total === 0
                  ? 'No results'
                  : `${searchData.total} result${searchData.total !== 1 ? 's' : ''}`}
                {activeQuery && (
                  <> for <span className="font-semibold text-surface-900 dark:text-surface-100">"{activeQuery}"</span></>
                )}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-surface-400">
                <Timer className="h-3.5 w-3.5" />
                {searchData.search_time_ms.toFixed(0)}ms
              </div>
            </motion.div>
          )}

          {/* States */}
          {isPending && <SearchSkeleton />}

          {!isPending && !hasSearched && (
            <NoQueryState onExample={selectSuggestion} />
          )}

          {!isPending && hasSearched && !hasResults && (
            <EmptyState query={activeQuery} />
          )}

          {!isPending && hasResults && (
            <motion.div layout className="space-y-4">
              {results.map((result, i) => (
                <SearchResultCard key={result.document_id} result={result} index={i} />
              ))}

              {/* Pagination */}
              {searchData && searchData.total_pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-700 dark:text-surface-300 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-surface-500">
                    {page} / {searchData.total_pages}
                  </span>
                  <button
                    disabled={page >= searchData.total_pages}
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-700 dark:text-surface-300 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Suggested tags strip */}
          {!hasSearched && suggestions?.tags && suggestions.tags.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400">
                Popular tags in your documents
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => selectSuggestion(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 transition-all"
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
