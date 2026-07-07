/**
 * SearchSkeleton — loading skeleton for search results.
 */

export function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-surface-100 dark:bg-surface-800 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-2/3 rounded-lg bg-surface-200 dark:bg-surface-700" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 rounded-full bg-surface-100 dark:bg-surface-800" />
                    <div className="h-5 w-16 rounded bg-surface-100 dark:bg-surface-800" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-6 w-10 rounded bg-surface-100 dark:bg-surface-800" />
                  <div className="h-3 w-8 rounded bg-surface-100 dark:bg-surface-800" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-surface-100 dark:bg-surface-800" />
                <div className="h-3 w-5/6 rounded bg-surface-100 dark:bg-surface-800" />
              </div>
              <div className="h-8 w-full rounded-lg bg-brand-50/50 dark:bg-brand-950/20" />
              <div className="flex gap-1.5">
                {[48, 60, 52, 44].map((w, j) => (
                  <div
                    key={j}
                    className="h-5 rounded-full bg-surface-100 dark:bg-surface-800"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterSkeleton() {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 p-4 animate-pulse">
      <div className="mb-4 h-5 w-1/3 rounded bg-surface-200 dark:bg-surface-700" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="mb-2 h-8 w-full rounded-lg bg-surface-100 dark:bg-surface-800" />
      ))}
    </div>
  );
}
