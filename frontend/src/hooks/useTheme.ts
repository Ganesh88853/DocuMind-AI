/**
 * Hook to access and update the application theme.
 * Wraps the Zustand themeStore for convenience.
 */

import { useEffect } from 'react';
import { useThemeStore } from '@store/themeStore';
import type { Theme } from '../types/index';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const { theme, resolvedTheme, setTheme, updateResolvedTheme } = useThemeStore();

  useEffect(() => {
    updateResolvedTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => updateResolvedTheme();
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [updateResolvedTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
  };
}
