/**
 * AIOverviewPanel — shows category, confidence, summary, and quick metadata.
 * Shown on the "Overview" tab in DocumentDetailPage.
 * Auto-polls while AI_PROCESSING.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, Tag, BarChart2, Clock, AlertCircle,
  RefreshCw, CheckCircle2,
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { isAIDone, isAIProcessing, isProcessing } from '@/types/document';

interface Props {
  documentId: string;
  currentStatus: string;
}

const CONFIDENCE_COLOR = (c: number) => {
  if (c >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (c >= 65) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
};

const CONFIDENCE_BG = (c: number) => {
  if (c >= 85) return 'from-emerald-500 to-teal-500';
  if (c >= 65) return 'from-amber-400 to-orange-400';
  return 'from-red-400 to-rose-500';
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-6 w-1/4 rounded-lg bg-surface-200 dark:bg-surface-700" />
      <div className="h-3 w-full rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-3 w-5/6 rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-3 w-4/6 rounded bg-surface-100 dark:bg-surface-800" />
    </div>
  );
}

export function AIOverviewPanel({ documentId, currentStatus }: Props) {
  const queryClient = useQueryClient();

  // Poll while AI is running — watch both prop and live data.status
  const { data, isLoading } = useQuery({
    queryKey: ['ai-summary', documentId],
    queryFn: () => documentService.getAISummary(documentId),
    refetchInterval: (query) => {
      const liveStatus = query.state.data?.status ?? currentStatus;
      const running =
        isProcessing(liveStatus as Parameters<typeof isProcessing>[0]) ||
        isAIProcessing(liveStatus as Parameters<typeof isAIProcessing>[0]);
      return running ? 2500 : false;
    },
    staleTime: 3000,
  });

  // Invalidate doc when AI completes
  useEffect(() => {
    if (data && isAIDone(data.status)) {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    }
  }, [data?.status, documentId, queryClient]);

  const reprocessMutation = useMutation({
    mutationFn: () => documentService.reprocessAI(documentId),
    onSuccess: () => {
      // Start polling immediately after triggering reprocess
      queryClient.invalidateQueries({ queryKey: ['ai-summary', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });

  // Still in OCR or AI phase
  if (
    isProcessing(currentStatus as Parameters<typeof isProcessing>[0]) ||
    isAIProcessing(currentStatus as Parameters<typeof isAIProcessing>[0])
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-500" />
          <Brain className="h-7 w-7 text-brand-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-surface-900 dark:text-surface-100">AI Processing…</p>
          <p className="mt-1 text-sm text-surface-500">Classifying, extracting metadata, and generating summary.</p>
        </div>
        <Skeleton />
      </div>
    );
  }

  if (isLoading) return <Skeleton />;

  // AI failed (has ai_error stored) — show error + retry
  if (data && !data.category && !data.summary && data.ai_error) {
    const isQuotaError = data.ai_error.toLowerCase().includes('quota') ||
                         data.ai_error.toLowerCase().includes('exhausted') ||
                         data.ai_error.toLowerCase().includes('rate limit') ||
                         data.ai_error.toLowerCase().includes('exceeded');

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${isQuotaError ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
          {isQuotaError
            ? <AlertCircle className="h-8 w-8 text-amber-500" />
            : <AlertCircle className="h-8 w-8 text-orange-500" />
          }
        </div>

        {isQuotaError ? (
          <div className="w-full max-w-sm">
            <p className="font-semibold text-surface-800 dark:text-surface-200">
              API Quota Reached
            </p>
            <p className="mt-1 text-sm text-surface-500">
              The Gemini free tier limit was reached for today. All available models were tried.
            </p>

            {/* Quota info card */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-800/50 dark:bg-amber-950/20">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Free Tier Limits
              </p>
              <ul className="space-y-1.5 text-sm text-amber-800 dark:text-amber-300">
                <li className="flex justify-between">
                  <span>gemini-2.5-flash-lite</span>
                  <span className="font-mono font-bold">20 req/day</span>
                </li>
                <li className="flex justify-between">
                  <span>Each document uses</span>
                  <span className="font-mono font-bold">~4 requests</span>
                </li>
                <li className="flex justify-between border-t border-amber-200 pt-1.5 dark:border-amber-800/50">
                  <span>Max docs/day</span>
                  <span className="font-mono font-bold">~5 documents</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs text-surface-400">
                Quota resets at <strong>midnight UTC</strong> each day.
                Come back tomorrow to process more documents.
              </p>
              <p className="text-xs text-surface-400">
                To remove limits,{' '}
                <a
                  href="https://console.cloud.google.com/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 underline decoration-dotted dark:text-brand-400"
                >
                  enable billing
                </a>
                {' '}on your Google Cloud project (free $300 credit for new users).
              </p>
            </div>

            <button
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-surface-500 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:text-surface-400 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
              {reprocessMutation.isPending ? 'Trying…' : 'Try Again'}
            </button>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-surface-800 dark:text-surface-200">
              AI Processing Failed
            </p>
            <p className="mt-2 max-w-sm text-sm text-surface-500">{data.ai_error}</p>
            <button
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
            >
              <RefreshCw className={`h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
              {reprocessMutation.isPending ? 'Starting…' : 'Retry AI Processing'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // OCR completed but AI never ran — Gemini API key likely not configured
  if (!data || (!data.category && !data.summary && !data.ai_error)) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
          <Brain className="h-8 w-8 text-surface-400" />
        </div>
        <div>
          <p className="font-semibold text-surface-800 dark:text-surface-200">
            AI Features Not Configured
          </p>
          <p className="mt-2 max-w-xs text-sm text-surface-500">
            OCR text was extracted successfully. To enable AI classification, summaries,
            and tags, add your Gemini API key.
          </p>
        </div>

        {/* Setup instructions card */}
        <div className="w-full max-w-sm rounded-xl border border-surface-200 bg-surface-50 p-4 text-left dark:border-surface-700 dark:bg-surface-800/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
            Setup (2 steps)
          </p>
          <ol className="space-y-2 text-sm text-surface-600 dark:text-surface-300">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                1
              </span>
              Get a free key at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 underline decoration-dotted hover:text-brand-700 dark:text-brand-400"
              >
                aistudio.google.com
              </a>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                2
              </span>
              <span>
                Add to{' '}
                <code className="rounded bg-surface-200 px-1.5 py-0.5 text-xs font-mono dark:bg-surface-700">
                  backend/.env
                </code>
                :
                <br />
                <code className="mt-1 block rounded bg-surface-200 px-2 py-1 text-xs font-mono text-surface-700 dark:bg-surface-700 dark:text-surface-200">
                  GEMINI_API_KEY=your-key-here
                </code>
              </span>
            </li>
          </ol>
          <p className="mt-3 text-xs text-surface-400">
            Then restart the backend and click "Reprocess AI" below.
          </p>
        </div>

        {/* Reprocess after key is added */}
        <button
          onClick={() => reprocessMutation.mutate()}
          disabled={reprocessMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-600 hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:text-brand-400 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
          {reprocessMutation.isPending ? 'Starting…' : 'Run AI (after adding key)'}
        </button>
      </div>
    );
  }

  const confidence = data.ai_confidence ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Category + Confidence row */}
      <div className="flex flex-wrap items-center gap-3">
        {data.category && (
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 shadow-sm">
            <Tag className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">{data.category}</span>
          </div>
        )}
        {data.subcategory && (
          <div className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-1.5 dark:border-surface-700 dark:bg-surface-800">
            <span className="text-sm text-surface-600 dark:text-surface-300">{data.subcategory}</span>
          </div>
        )}
      </div>

      {/* Confidence gauge */}
      {data.ai_confidence != null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-surface-500">
              <BarChart2 className="h-3.5 w-3.5" />
              AI Confidence
            </div>
            <span className={`text-sm font-bold ${CONFIDENCE_COLOR(confidence)}`}>
              {confidence.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${CONFIDENCE_BG(confidence)}`}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {data.summary ? (
        <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-surface-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            AI Summary
          </div>
          <p className="text-sm leading-relaxed text-surface-800 dark:text-surface-200">
            {data.summary}
          </p>
        </div>
      ) : null}

      {/* Processed at */}
      {data.processed_at && (
        <div className="flex items-center gap-1.5 text-xs text-surface-400">
          <Clock className="h-3.5 w-3.5" />
          Processed {new Date(data.processed_at).toLocaleString()}
        </div>
      )}

      {/* Reprocess button */}
      <div className="flex justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
        <button
          onClick={() => reprocessMutation.mutate()}
          disabled={reprocessMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-500 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:hover:text-brand-400"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
          {reprocessMutation.isPending ? 'Reprocessing…' : 'Reprocess AI'}
        </button>
      </div>
    </motion.div>
  );
}
