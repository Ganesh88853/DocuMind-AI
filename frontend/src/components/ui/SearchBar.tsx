/**
 * SearchBar — animated search input placeholder.
 * Will be wired to document search in Milestone 3.
 */

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@utils/cn';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({
  placeholder = 'Search documents…',
  className,
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Search className="h-4 w-4 text-surface-400" />
      </div>

      <input
        id="search-bar"
        type="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-11 pr-10',
          'text-sm text-surface-900 placeholder-surface-400',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50',
          'dark:placeholder-surface-500 dark:focus:border-brand-400',
          'transition-all duration-200'
        )}
        aria-label="Search documents"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
