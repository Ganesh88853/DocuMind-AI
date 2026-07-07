/**
 * ConversationSidebar — lists all conversations and allows creating new ones.
 * Shows title, date, and message count. Highlights the active conversation.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { assistantService } from '@services/assistantService';
import type { ConversationSummary } from '@/types/assistant';

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ConversationSidebar({ activeId, onSelect, onNew }: Props) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const { data } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => assistantService.listConversations(),
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assistantService.deleteConversation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeId === id) onNew();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      assistantService.renameConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setEditingId(null);
    },
  });

  const startEdit = (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title ?? '');
  };

  const commitEdit = (id: string) => {
    if (editTitle.trim()) {
      renameMutation.mutate({ id, title: editTitle.trim() });
    } else {
      setEditingId(null);
    }
  };

  const conversations = data?.conversations ?? [];

  return (
    <aside className="flex h-full w-72 flex-col border-r border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 p-4 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-500" />
          <span className="font-semibold text-surface-800 dark:text-surface-200">Conversations</span>
        </div>
        <button
          id="new-conversation-btn"
          onClick={onNew}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-95"
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <div className="mt-8 px-4 text-center text-sm text-surface-400">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No conversations yet.
            <br />
            Start a new chat above.
          </div>
        )}

        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const isEditing = editingId === conv.id;

          return (
            <div
              key={conv.id}
              onClick={() => !isEditing && onSelect(conv.id)}
              className={`group mb-1 cursor-pointer rounded-xl px-3 py-2.5 transition-all ${
                isActive
                  ? 'bg-brand-100 dark:bg-brand-900/40'
                  : 'hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              {isEditing ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(conv.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full rounded-md border border-brand-300 bg-white px-2 py-1 text-sm dark:border-brand-600 dark:bg-surface-800 dark:text-surface-100"
                  />
                  <button onClick={() => commitEdit(conv.id)} className="text-green-500 hover:text-green-600">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-surface-400 hover:text-surface-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${
                      isActive ? 'text-brand-700 dark:text-brand-300' : 'text-surface-700 dark:text-surface-300'
                    }`}>
                      {conv.title ?? 'New conversation'}
                    </p>
                    <p className="mt-0.5 text-xs text-surface-400">
                      {conv.message_count} messages · {timeAgo(conv.updated_at)}
                    </p>
                  </div>

                  {/* Action buttons — visible on hover */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => startEdit(conv, e)}
                      className="rounded p-1 text-surface-400 hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(conv.id);
                      }}
                      className="rounded p-1 text-surface-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
