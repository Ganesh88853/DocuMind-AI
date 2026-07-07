/**
 * DocumentsPage — main document library with grid/list toggle, search, pagination, and favorites.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutGrid, List, Search, Upload, Star, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentRow } from '@/components/documents/DocumentRow';
import { DocumentSkeleton } from '@/components/documents/DocumentSkeleton';
import { EmptyDocuments } from '@/components/documents/EmptyDocuments';
import { cn } from '@utils/cn';

const PAGE_SIZE = 12;

export default function DocumentsPage() {
  const navigate = useNavigate();
  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    favoritesOnly, setFavoritesOnly,
  } = useDocumentStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', { page: currentPage, search: searchQuery, favoritesOnly }],
    queryFn: () =>
      documentService.list({
        page: currentPage,
        page_size: PAGE_SIZE,
        search: searchQuery || undefined,
        favorites_only: favoritesOnly,
      }),
    staleTime: 30_000,
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const clearSearch = () => setSearchQuery('');

  const documents = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const hasFilter = !!searchQuery || favoritesOnly;

  return (
    <div className="min-h-full">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            My Documents
          </h1>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-surface-500">
              {total} document{total !== 1 ? 's' : ''}
              {favoritesOnly ? ' · Favorites' : ''}
              {searchQuery ? ` · "${searchQuery}"` : ''}
            </p>
          )}
        </div>

        <button
          id="upload-document-btn"
          onClick={() => navigate('/dashboard/upload')}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500
                     px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20
                     transition-all hover:shadow-brand-500/40 hover:scale-105 active:scale-95"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            id="document-search"
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by filename…"
            className="w-full rounded-xl border border-surface-200 bg-white py-2.5 pl-9 pr-9 text-sm
                       text-surface-900 placeholder-surface-400 outline-none ring-0 transition-all
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-100
                       dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100
                       dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Favorites filter */}
        <button
          id="favorites-filter-btn"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
            favoritesOnly
              ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-600'
              : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300'
          )}
        >
          <Star className={`h-4 w-4 ${favoritesOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
          Favorites
        </button>

        {/* View toggle */}
        <div className="flex rounded-xl border border-surface-200 bg-white overflow-hidden dark:border-surface-600 dark:bg-surface-800">
          <button
            id="grid-view-btn"
            onClick={() => setViewMode('grid')}
            className={cn(
              'px-3 py-2.5 transition-colors',
              viewMode === 'grid'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
                : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            id="list-view-btn"
            onClick={() => setViewMode('list')}
            className={cn(
              'border-l border-surface-200 px-3 py-2.5 transition-colors dark:border-surface-600',
              viewMode === 'list'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
                : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {isLoading ? (
        <DocumentSkeleton count={PAGE_SIZE} mode={viewMode} />
      ) : isError ? (
        <div className="py-16 text-center text-sm text-red-500">Failed to load documents. Please refresh.</div>
      ) : documents.length === 0 ? (
        <EmptyDocuments hasSearch={hasFilter} />
      ) : viewMode === 'grid' ? (
        <motion.div
          layout
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {documents.map((doc) => <DocumentCard key={doc.id} document={doc} />)}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => <DocumentRow key={doc.id} document={doc} />)}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-surface-500">
            Page {currentPage} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              id="prev-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm
                         font-medium text-surface-600 transition-all hover:border-brand-300 hover:text-brand-600
                         disabled:cursor-not-allowed disabled:opacity-40
                         dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              id="next-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm
                         font-medium text-surface-600 transition-all hover:border-brand-300 hover:text-brand-600
                         disabled:cursor-not-allowed disabled:opacity-40
                         dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
