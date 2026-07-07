/**
 * DocumentSkeleton — shimmer loading placeholders for document cards/rows.
 */

interface Props {
  count?: number;
  mode?: 'grid' | 'list';
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
      <div className="mb-3 h-14 w-14 rounded-xl bg-surface-200 dark:bg-surface-700" />
      <div className="mb-2 h-4 w-3/4 rounded bg-surface-200 dark:bg-surface-700" />
      <div className="mb-3 h-3 w-1/2 rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-5 w-16 rounded-full bg-surface-100 dark:bg-surface-800" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-xl border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
      <div className="h-9 w-9 rounded-lg bg-surface-200 dark:bg-surface-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-surface-200 dark:bg-surface-700" />
        <div className="h-3 w-1/4 rounded bg-surface-100 dark:bg-surface-800" />
      </div>
      <div className="h-5 w-16 rounded-full bg-surface-100 dark:bg-surface-800" />
    </div>
  );
}

export function DocumentSkeleton({ count = 8, mode = 'grid' }: Props) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (mode === 'list') {
    return (
      <div className="space-y-2">
        {items.map((i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((i) => <SkeletonCard key={i} />)}
    </div>
  );
}
