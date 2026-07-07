/**
 * ThemeToggle — animated button that cycles between light, dark, and system themes.
 */

import { Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@hooks/useTheme';
import { cn } from '@utils/cn';
import type { Theme } from '../types/index';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
  { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
  { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
];

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((t) => t.value === theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme.value);
  };

  const currentThemeConfig = themes.find((t) => t.value === theme) ?? themes[0];

  return (
    <button
      onClick={cycleTheme}
      id="theme-toggle"
      aria-label={`Switch to ${themes[(themes.findIndex((t) => t.value === theme) + 1) % themes.length].label} mode`}
      className={cn(
        'relative flex items-center gap-2 rounded-xl px-3 py-2',
        'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
        'dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100',
        'transition-all duration-200 font-medium text-sm',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.5, rotate: 30, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentThemeConfig.icon}
        </motion.span>
      </AnimatePresence>
      {showLabel && (
        <span className="hidden sm:inline">{currentThemeConfig.label}</span>
      )}
    </button>
  );
}
