/**
 * LoadingSpinner — animated SVG spinner with size and color variants.
 */

import { cn } from '@utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
  xl: 'h-16 w-16',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading…'}
      className={cn('flex items-center justify-center', className)}
    >
      <svg
        className={cn('animate-spin text-brand-500', sizeMap[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && (
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">{label}</span>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 p-3 shadow-glow-md">
            <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-white">
              <path
                d="M9 12h6M9 16h6M9 8h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-500/30 to-accent-500/30 blur-md -z-10 animate-pulse-slow" />
        </div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          Loading DocuMind AI…
        </p>
      </div>
    </div>
  );
}
