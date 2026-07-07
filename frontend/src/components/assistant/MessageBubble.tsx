/**
 * MessageBubble — renders a single chat message.
 * User messages: right-aligned, brand colored.
 * Assistant messages: left-aligned with avatar, supports citations toggle.
 */

import { useState } from 'react';
import { Bot, User, Copy, Check, BookOpen } from 'lucide-react';
import type { ChatMessage, Citation } from '@/types/assistant';

interface Props {
  message: ChatMessage;
  onShowCitations?: (citations: Citation[]) => void;
}

export function MessageBubble({ message, onShowCitations }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        isUser
          ? 'bg-brand-500 text-white'
          : 'bg-gradient-to-br from-violet-500 to-brand-600 text-white'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`group relative max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-brand-500 text-white'
            : 'rounded-tl-sm bg-white text-surface-800 shadow-sm ring-1 ring-surface-100 dark:bg-surface-800 dark:text-surface-100 dark:ring-surface-700'
        }`}>
          {/* Render content preserving line breaks */}
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Assistant actions row */}
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            {message.citations && message.citations.length > 0 && (
              <button
                onClick={() => onShowCitations?.(message.citations!)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
              >
                <BookOpen className="h-3 w-3" />
                {message.citations.length} source{message.citations.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
