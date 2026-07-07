/**
 * OCRTextPanel — displays the extracted text from a document with metadata,
 * auto-polling while OCR is in progress.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileSearch, Copy, CheckCircle2, AlertCircle, Loader2,
  Clock, Globe, Layers, Cpu,
} from 'lucide-react';
import { useState } from 'react';
import { documentService } from '@/services/documentService';
import { isProcessing, isOCRDone } from '@/types/document';

interface Props {
  documentId: string;
  currentStatus: string;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      <div className="h-4 w-1/3 rounded bg-surface-200 dark:bg-surface-700" />
      <div className="h-3 w-full rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-3 w-5/6 rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-3 w-4/6 rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-3 w-full rounded bg-surface-100 dark:bg-surface-800" />
      <div className="h-3 w-3/4 rounded bg-surface-100 dark:bg-surface-800" />
    </div>
  );
}

function MetaChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 dark:border-surface-700 dark:bg-surface-800">
      <Icon className="h-3.5 w-3.5 text-surface-400" />
      <span className="text-xs text-surface-500">{label}:</span>
      <span className="text-xs font-semibold text-surface-800 dark:text-surface-200">{value}</span>
    </div>
  );
}

export function OCRTextPanel({ documentId, currentStatus }: Props) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Poll processing status while OCR is running
  const statusQuery = useQuery({
    queryKey: ['processing-status', documentId],
    queryFn: () => documentService.getProcessingStatus(documentId),
    refetchInterval: isProcessing(currentStatus as Parameters<typeof isProcessing>[0]) ? 2000 : false,
    staleTime: 1000,
  });

  const liveStatus = statusQuery.data?.status ?? currentStatus;

  // Once processing is done, fetch full OCR result and invalidate the doc query
  useEffect(() => {
    if (isOCRDone(liveStatus as Parameters<typeof isOCRDone>[0])) {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    }
  }, [liveStatus, documentId, queryClient]);

  const ocrQuery = useQuery({
    queryKey: ['ocr-text', documentId],
    queryFn: () => documentService.getOCRText(documentId),
    enabled: isOCRDone(liveStatus as Parameters<typeof isOCRDone>[0]),
    staleTime: 60_000,
  });

  const handleCopy = async () => {
    if (ocrQuery.data?.extracted_text) {
      await navigator.clipboard.writeText(ocrQuery.data.extracted_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Still processing ──────────────────────────────────────────────────────
  if (isProcessing(liveStatus as Parameters<typeof isProcessing>[0])) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-500" />
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-surface-900 dark:text-surface-100">
            OCR Processing…
          </p>
          <p className="mt-1 text-sm text-surface-500">
            Extracting text from your document. This usually takes a few seconds.
          </p>
        </div>
        <Skeleton />
      </div>
    );
  }

  // ── OCR Failed ────────────────────────────────────────────────────────────
  if (liveStatus === 'OCR_FAILED' || liveStatus === 'FAILED') {
    const errorMsg = statusQuery.data?.error_message;
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/40">
          <AlertCircle className="h-8 w-8 text-orange-500" />
        </div>
        <div>
          <p className="font-semibold text-surface-900 dark:text-surface-100">
            OCR Extraction Failed
          </p>
          <p className="mt-2 max-w-md text-sm text-surface-500">
            {errorMsg ??
              'Text extraction could not be completed. The document is still available for download.'}
          </p>
          {errorMsg?.includes('Tesseract') && (
            <a
              href="https://github.com/UB-Mannheim/tesseract/wiki"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-brand-600 underline hover:text-brand-700"
            >
              Install Tesseract OCR →
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Loading OCR text ───────────────────────────────────────────────────────
  if (ocrQuery.isLoading) return <Skeleton />;

  // ── No text yet ────────────────────────────────────────────────────────────
  if (!ocrQuery.data?.extracted_text) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
          <FileSearch className="h-8 w-8 text-surface-400" />
        </div>
        <p className="text-sm text-surface-500">No extracted text available yet.</p>
      </div>
    );
  }

  const ocr = ocrQuery.data;
  const wordCount = ocr.extracted_text!.split(/\s+/).filter(Boolean).length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="ocr-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          {ocr.total_pages != null && (
            <MetaChip icon={Layers} label="Pages" value={ocr.total_pages} />
          )}
          {ocr.detected_language && (
            <MetaChip icon={Globe} label="Language" value={ocr.detected_language.toUpperCase()} />
          )}
          {ocr.processing_time != null && (
            <MetaChip icon={Clock} label="Processed in" value={`${ocr.processing_time.toFixed(2)}s`} />
          )}
          {ocr.ocr_engine && (
            <MetaChip icon={Cpu} label="Engine" value={ocr.ocr_engine} />
          )}
          <MetaChip icon={FileSearch} label="Words" value={wordCount.toLocaleString()} />
        </div>

        {/* Text box */}
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5
                       text-xs font-medium text-surface-600 shadow-sm transition-all hover:bg-surface-50
                       dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>

          <pre
            className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-surface-200 bg-surface-50
                       p-5 pt-10 font-mono text-sm leading-relaxed text-surface-800
                       dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-200"
          >
            {ocr.extracted_text}
          </pre>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
