/**
 * Zustand store for managing the UI theme (light / dark / system).
 * Persists the user's preference to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '../types/index';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  updateResolvedTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (resolved: 'light' | 'dark'): void => {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),

      setTheme: (theme: Theme) => {
        set({ theme });
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        set({ resolvedTheme: resolved });
        applyTheme(resolved);
      },

      updateResolvedTheme: () => {
        const { theme } = get();
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        set({ resolvedTheme: resolved });
        applyTheme(resolved);
      },
    }),
    {
      name: 'documind-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
