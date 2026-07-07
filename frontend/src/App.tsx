/**
 * App — root application component.
 * Wraps the app with TanStack Query provider and initializes theme on mount.
 */

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@routes/AppRouter';
import { useThemeStore } from '@store/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeInitializer() {
  const { updateResolvedTheme } = useThemeStore();

  useEffect(() => {
    updateResolvedTheme();
  }, [updateResolvedTheme]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <AppRouter />
    </QueryClientProvider>
  );
}

export default App;
