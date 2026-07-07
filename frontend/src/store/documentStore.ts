/**
 * Document Zustand store — manages UI state for the documents section.
 * API data is managed by TanStack Query; this store handles only UI preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode } from '@/types/document';

interface DocumentUIState {
  viewMode: ViewMode;
  searchQuery: string;
  currentPage: number;
  favoritesOnly: boolean;

  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setFavoritesOnly: (value: boolean) => void;
  resetFilters: () => void;
}

export const useDocumentStore = create<DocumentUIState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      searchQuery: '',
      currentPage: 1,
      favoritesOnly: false,

      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setFavoritesOnly: (value) => set({ favoritesOnly: value, currentPage: 1 }),
      resetFilters: () =>
        set({ searchQuery: '', currentPage: 1, favoritesOnly: false }),
    }),
    {
      name: 'documind-document-ui',
      partialize: (state) => ({ viewMode: state.viewMode }),
    }
  )
);
