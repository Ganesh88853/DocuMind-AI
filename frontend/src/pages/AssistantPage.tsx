/**
 * AssistantPage — Milestone 7: Grounded RAG Document Assistant
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │ ConversationSidebar │ ChatWindow │ CitationPanel │
 *   └─────────────────────────────────────────────────┘
 *
 * Features:
 *   - Multi-turn conversations with history
 *   - Auto-scroll to latest message
 *   - Suggested prompts on empty state
 *   - Follow-up questions chips
 *   - Citation panel (slides in on click)
 *   - Dark mode, responsive
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, AlertCircle, ChevronRight } from 'lucide-react';
import { ConversationSidebar } from '@components/assistant/ConversationSidebar';
import { MessageBubble } from '@components/assistant/MessageBubble';
import { CitationPanel } from '@components/assistant/CitationPanel';
import { TypingIndicator } from '@components/assistant/TypingIndicator';
import { SuggestedPrompts } from '@components/assistant/SuggestedPrompts';
import { assistantService } from '@services/assistantService';
import type { ChatMessage, Citation } from '@/types/assistant';

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [selectedCitations, setSelectedCitations] = useState<Citation[] | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [waitingTooLong, setWaitingTooLong] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversation when switching
  const { data: convDetail } = useQuery({
    queryKey: ['conversation', activeConvId],
    queryFn: () => assistantService.getConversation(activeConvId!),
    enabled: !!activeConvId,
    staleTime: 10_000,
  });

  // Sync messages when conversation loads
  useEffect(() => {
    if (convDetail) {
      setLocalMessages(convDetail.messages);
      setFollowUps([]);
    }
  }, [convDetail]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, scrollToBottom]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (q: string) =>
      assistantService.chat({
        question: q,
        conversation_id: activeConvId,
      }),
    onSuccess: (res) => {
      // Clear slow timer
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setWaitingTooLong(false);

      // Activate conversation if new
      if (!activeConvId) {
        setActiveConvId(res.conversation_id);
      }
      // Append both messages
      setLocalMessages((prev) => {
        // Remove the optimistic user message, replace with real ones
        const withoutOptimistic = prev.filter((m) => m.id !== 'optimistic');
        return [...withoutOptimistic, res.user_message, res.assistant_message];
      });
      setFollowUps(res.follow_up_questions);

      // Refresh sidebar
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: unknown) => {
      // Clear slow timer
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setWaitingTooLong(false);

      // Keep the user question visible — replace optimistic with a stable id
      // Add an error assistant message so the user knows what happened
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail ?? 'Something went wrong. Please try again.';
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === 'optimistic' ? { ...m, id: `err-user-${Date.now()}` } : m,
        ).concat({
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${detail}`,
          created_at: new Date().toISOString(),
        })
      );
    },
  });

  const submit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || chatMutation.isPending) return;

      // Start slow-loading timer (show extra message after 10s)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => setWaitingTooLong(true), 10_000);

      // Optimistic user message
      const optimistic: ChatMessage = {
        id: 'optimistic',
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, optimistic]);
      setFollowUps([]);
      setQuestion('');

      chatMutation.mutate(trimmed);
    },
    [chatMutation],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(question);
    }
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setLocalMessages([]);
    setFollowUps([]);
    setSelectedCitations(null);
    setQuestion('');
    inputRef.current?.focus();
  };

  const hasMessages = localMessages.length > 0;
  const isLoading = chatMutation.isPending;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-surface-50 dark:bg-surface-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <ConversationSidebar
        activeId={activeConvId}
        onSelect={(id) => {
          setActiveConvId(id);
          setSelectedCitations(null);
          setFollowUps([]);
        }}
        onNew={startNewConversation}
      />

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-surface-200 bg-white px-6 py-3 dark:border-surface-700 dark:bg-surface-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              DocuMind AI Assistant
            </p>
            <p className="text-xs text-surface-400">Answers grounded in your documents</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!hasMessages && !isLoading ? (
            <SuggestedPrompts onSelect={(p) => { setQuestion(p); inputRef.current?.focus(); }} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {localMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onShowCitations={(cits) => setSelectedCitations(cits)}
                />
              ))}

              {/* Typing indicator */}
              {isLoading && <TypingIndicator slow={waitingTooLong} />}

              {/* Error */}
              {chatMutation.isError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Failed to send. Please try again.
                </div>
              )}

              {/* Follow-up questions */}
              {followUps.length > 0 && !isLoading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {followUps.map((fq) => (
                    <button
                      key={fq}
                      onClick={() => submit(fq)}
                      className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-all hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:bg-brand-900/40"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {fq}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ─────────────────────────────────────────────────── */}
        <div className="border-t border-surface-200 bg-white px-6 py-4 dark:border-surface-700 dark:bg-surface-900">
          <div className="mx-auto max-w-3xl">
            <div className={`flex items-end gap-3 rounded-2xl border bg-surface-50 px-4 py-3 transition-all dark:bg-surface-800 ${
              isLoading
                ? 'border-brand-300 ring-2 ring-brand-100 dark:ring-brand-900/30'
                : 'border-surface-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:border-surface-700 dark:focus-within:ring-brand-900/30'
            }`}>
              <textarea
                ref={inputRef}
                id="chat-input"
                rows={1}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your documents…"
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent text-sm text-surface-800 placeholder-surface-400 outline-none dark:text-surface-100 dark:placeholder-surface-500"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
              />
              <button
                id="chat-send-btn"
                onClick={() => submit(question)}
                disabled={!question.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-surface-400">
              Answers are grounded in your documents only · Press Enter to send
            </p>
          </div>
        </div>
      </div>

      {/* ── Citation panel (conditional) ─────────────────────────────────── */}
      {selectedCitations && (
        <CitationPanel
          citations={selectedCitations}
          onClose={() => setSelectedCitations(null)}
        />
      )}
    </div>
  );
}
