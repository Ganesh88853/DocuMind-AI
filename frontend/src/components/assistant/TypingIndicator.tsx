/** TypingIndicator — animated three-dot pulse while AI is generating.
 *  When `slow` is true (after 10s), shows a reassuring message.
 */

interface Props {
  slow?: boolean;
}

export function TypingIndicator({ slow = false }: Props) {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-brand-600 text-white">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" />
        </svg>
      </div>

      {/* Bubble */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-surface-100 dark:bg-surface-800 dark:ring-surface-700">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-surface-400 dark:bg-surface-500"
              style={{
                animation: 'typing-bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Slow message — appears after 10s */}
        {slow && (
          <p className="ml-1 text-xs text-surface-400 animate-pulse">
            ⏳ Searching your documents and generating answer… this may take up to 30s
          </p>
        )}
      </div>

      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
