/**
 * DocumentDetailPage — 5-tab document view.
 * Tabs: Overview | Extracted Text | AI Summary | Metadata | Tags
 * Auto-refreshes while OCR or AI processing is in progress.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Trash2, Star, FileText, Image, File,
  Calendar, HardDrive, Tag, AlignLeft, Activity,
  FileSearch, Brain, Database,
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { OCRTextPanel } from '@/components/documents/OCRTextPanel';
import { AIOverviewPanel } from '@/components/documents/AIOverviewPanel';
import { MetadataPanel } from '@/components/documents/MetadataPanel';
import { TagsPanel } from '@/components/documents/TagsPanel';
import { isProcessing } from '@/types/document';

type Tab = 'overview' | 'text' | 'summary' | 'metadata' | 'tags';

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  if (['.png', '.jpg', '.jpeg'].includes(e)) return <Image className="h-12 w-12 text-violet-500" />;
  if (['.pdf'].includes(e)) return <FileText className="h-12 w-12 text-red-500" />;
  return <File className="h-12 w-12 text-blue-500" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-surface-100 py-3 last:border-0 dark:border-surface-800">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500 dark:bg-surface-800">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-surface-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-surface-900 dark:text-surface-100">{value}</div>
      </div>
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.getById(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s && isProcessing(s) ? 3000 : false;
    },
  });

  const favMutation = useMutation({
    mutationFn: () => documentService.toggleFavorite(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/dashboard/documents');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4">
        <div className="h-6 w-1/3 rounded bg-surface-200 dark:bg-surface-700" />
        <div className="h-56 rounded-2xl bg-surface-100 dark:bg-surface-800" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="py-20 text-center">
        <p className="text-surface-500">Document not found.</p>
        <button onClick={() => navigate('/dashboard/documents')} className="mt-4 text-sm text-brand-600 hover:underline">
          Back to documents
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; pulse?: boolean }[] = [
    { id: 'overview',  label: 'Overview',       icon: Brain,      pulse: doc.status === 'AI_PROCESSING' },
    { id: 'text',      label: 'Extracted Text',  icon: FileSearch, pulse: doc.status === 'OCR_PROCESSING' },
    { id: 'summary',   label: 'AI Summary',      icon: Brain },
    { id: 'metadata',  label: 'Metadata',        icon: Database },
    { id: 'tags',      label: 'Tags',            icon: Tag },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard/documents')}
        className="mb-6 flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-surface-900 dark:hover:text-surface-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-900"
      >
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-50 to-accent-50 px-6 py-8 dark:from-brand-950/40 dark:to-accent-950/30">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-surface-800">
              <FileIcon ext={doc.file_extension} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-surface-900 dark:text-surface-100">
                {doc.original_filename}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DocumentStatusBadge status={doc.status} size="md" />
                {doc.category && (
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                    {doc.category}
                  </span>
                )}
                <span className="text-sm text-surface-500">{formatBytes(doc.file_size)}</span>
              </div>
              {doc.ai_confidence != null && (
                <p className="mt-1 text-xs text-surface-400">
                  AI confidence: <span className="font-semibold text-surface-600 dark:text-surface-300">{doc.ai_confidence.toFixed(0)}%</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-surface-200 dark:border-surface-700 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.pulse && (
                  <span className="relative ml-0.5 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div className="p-6">
                <AIOverviewPanel documentId={doc.id} currentStatus={doc.status} />
              </div>
            )}

            {/* ── Extracted Text ── */}
            {activeTab === 'text' && (
              <div className="p-6">
                <OCRTextPanel documentId={doc.id} currentStatus={doc.status} />
              </div>
            )}

            {/* ── AI Summary ── */}
            {activeTab === 'summary' && (
              <div className="p-6">
                <AIOverviewPanel documentId={doc.id} currentStatus={doc.status} />
              </div>
            )}

            {/* ── Metadata ── */}
            {activeTab === 'metadata' && (
              <div className="p-6">
                <MetadataPanel documentId={doc.id} />
              </div>
            )}

            {/* ── Tags ── */}
            {activeTab === 'tags' && (
              <div className="p-6">
                <TagsPanel documentId={doc.id} />
              </div>
            )}

            {/* ── Details panel (shown below tab content for all tabs) ── */}
            {activeTab === 'overview' && (
              <div className="border-t border-surface-100 px-6 dark:border-surface-800">
                <MetaRow icon={<Calendar className="h-4 w-4" />} label="Uploaded" value={formatDate(doc.created_at)} />
                <MetaRow icon={<HardDrive className="h-4 w-4" />} label="File size" value={formatBytes(doc.file_size)} />
                <MetaRow icon={<Activity className="h-4 w-4" />} label="MIME type" value={doc.mime_type} />
                <MetaRow
                  icon={<AlignLeft className="h-4 w-4" />}
                  label="Description"
                  value={
                    <span className={doc.description ? '' : 'italic text-surface-400'}>
                      {doc.description ?? 'No description'}
                    </span>
                  }
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Actions footer */}
        <div className="flex flex-wrap items-center gap-3 border-t border-surface-100 px-6 py-4 dark:border-surface-800">
          <button
            id="favorite-toggle-btn"
            onClick={() => favMutation.mutate()}
            disabled={favMutation.isPending}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all
              ${doc.is_favorite
                ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                : 'border-surface-200 bg-white text-surface-600 hover:border-amber-300 hover:text-amber-600 dark:border-surface-600 dark:bg-surface-800'
              }`}
          >
            <Star className={`h-4 w-4 ${doc.is_favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
            {doc.is_favorite ? 'Favorited' : 'Favorite'}
          </button>

          <button
            id="download-btn"
            disabled={isDownloading}
            onClick={async () => {
              setIsDownloading(true);
              try {
                await documentService.downloadFile(doc.id, doc.original_filename);
              } catch {
                // If the download fails, silently reset — the user can retry
              } finally {
                setIsDownloading(false);
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Downloading…' : 'Download'}
          </button>

          <div className="ml-auto">
            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Are you sure?</span>
                <button
                  onClick={() => deleteMutation.mutate()}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="rounded-lg border border-surface-200 px-3 py-2 text-xs text-surface-600 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="delete-document-btn"
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
