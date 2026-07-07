/**
 * DashboardPage — Live dashboard with real document stats, OCR data, and AI category distribution.
 * Milestone 5: AI stats widgets, category distribution, and top tags.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Zap, Upload, MessageSquare,
  Search, FolderOpen, Clock, Brain, ChevronRight,
  CheckCircle2, Loader2, AlertCircle,
  Layers, BarChart3, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { documentService } from '@/services/documentService';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import type { Document } from '@/types/document';

// Quick actions
const quickActions = [
  { id: 'action-upload', label: 'Upload Document', icon: Upload, color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/50 dark:text-brand-400', path: '/dashboard/upload' },
  { id: 'action-ask', label: 'Ask AI', icon: MessageSquare, color: 'text-accent-600 bg-accent-50 dark:bg-accent-950/50 dark:text-accent-400', path: '/dashboard/upload' },
  { id: 'action-search', label: 'Smart Search', icon: Search, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400', path: '/dashboard/documents' },
  { id: 'action-browse', label: 'Browse Docs', icon: FolderOpen, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400', path: '/dashboard/documents' },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusIcon(status: Document['status']) {
  if (status === 'OCR_COMPLETED' || status === 'COMPLETED' || status === 'READY') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  }
  if (status === 'OCR_PROCESSING' || status === 'UPLOADING' || status === 'AI_PROCESSING') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />;
  }
  if (status === 'OCR_FAILED' || status === 'FAILED') {
    return <AlertCircle className="h-3.5 w-3.5 text-orange-500" />;
  }
  return null;
}




// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Live recent documents from API
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['documents', { page: 1, dashboard: true }],
    queryFn: () => documentService.list({ page: 1, page_size: 8 }),
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  const recentDocs = recentData?.items ?? [];

  // Compute live stats
  const ocrCompleted = recentDocs.filter(d =>
    d.status === 'OCR_COMPLETED' || d.status === 'COMPLETED'
  ).length;
  const ocrProcessing = recentDocs.filter(d =>
    d.status === 'OCR_PROCESSING' || d.status === 'UPLOADING' || d.status === 'AI_PROCESSING'
  ).length;
  const totalDocs = recentData?.total ?? 0;
  const aiDone = recentDocs.filter(d => d.status === 'COMPLETED').length;

  // Category distribution from real data
  const categoryMap = recentDocs
    .filter(d => d.category)
    .reduce<Record<string, number>>((acc, d) => {
      acc[d.category!] = (acc[d.category!] || 0) + 1;
      return acc;
    }, {});
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const maxCat = categoryEntries[0]?.[1] || 1;

  // Unique categories for tag chips
  const uniqueCategories = recentDocs
    .filter(d => d.category)
    .map(d => d.category!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);

  return (
    <motion.div
      className="space-y-8 pb-8"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {greeting} 👋
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Here's what's happening with your documents today.
          </p>
        </div>
        <Button variant="gradient" size="md" id="upload-cta" onClick={() => navigate('/dashboard/upload')}>
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Total Documents — real */}
          <Card hover className="relative overflow-hidden" id="stat-total-docs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Documents</p>
                <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {recentLoading ? '—' : totalDocs.toLocaleString()}
                </p>
                <p className="mt-1.5 text-xs text-surface-400">in your library</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40">
                <FileText className="h-6 w-6 text-brand-700 dark:text-brand-300" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 h-20 w-20 bg-gradient-to-br from-brand-500 to-brand-600 opacity-5 rounded-tl-3xl" />
          </Card>

          {/* AI Completed — real */}
          <Card hover className="relative overflow-hidden" id="stat-ai-complete">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">AI Processed</p>
                <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {recentLoading ? '—' : aiDone}
                </p>
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">classified + summarised</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40">
                <CheckCircle2 className="h-6 w-6 text-teal-700 dark:text-teal-300" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 h-20 w-20 bg-gradient-to-br from-teal-500 to-emerald-500 opacity-5 rounded-tl-3xl" />
          </Card>

          {/* OCR Completed — real */}
          <Card hover className="relative overflow-hidden" id="stat-ocr-success">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">OCR Completed</p>
                <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {recentLoading ? '—' : ocrCompleted}
                </p>
                <p className="mt-1.5 text-xs text-brand-600 dark:text-brand-400">text extracted</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40">
                <Brain className="h-6 w-6 text-brand-700 dark:text-brand-300" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 h-20 w-20 bg-gradient-to-br from-brand-500 to-accent-500 opacity-5 rounded-tl-3xl" />
          </Card>

          {/* Processing Queue — real */}
          <Card hover className="relative overflow-hidden" id="stat-ocr-queue">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Processing Queue</p>
                <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {recentLoading ? '—' : ocrProcessing}
                </p>
                <p className="mt-1.5 text-xs text-violet-600 dark:text-violet-400">running now</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40">
                <Zap className="h-6 w-6 text-violet-700 dark:text-violet-300" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 h-20 w-20 bg-gradient-to-br from-violet-500 to-purple-600 opacity-5 rounded-tl-3xl" />
          </Card>
        </div>
      </motion.div>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Documents — live API data */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card padding="none">
            <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-0 mb-0">
              <div>
                <CardTitle>Recently Processed</CardTitle>
                <CardDescription className="mt-0.5">Latest uploads with OCR + AI status</CardDescription>
              </div>
              <Button
                variant="ghost" size="sm"
                className="text-brand-600 dark:text-brand-400 -mr-2"
                onClick={() => navigate('/dashboard/documents')}
              >
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-surface-100 dark:divide-surface-700 mt-4">
                {recentLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3.5 animate-pulse">
                      <div className="h-10 w-10 rounded-xl bg-surface-200 dark:bg-surface-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-3/4 rounded bg-surface-200 dark:bg-surface-700" />
                        <div className="h-3 w-1/3 rounded bg-surface-100 dark:bg-surface-800" />
                      </div>
                    </div>
                  ))
                ) : recentDocs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-surface-400">
                    No documents yet —{' '}
                    <button onClick={() => navigate('/dashboard/upload')} className="text-brand-600 hover:underline">
                      upload your first
                    </button>
                  </div>
                ) : (
                  recentDocs.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                      className="flex cursor-pointer items-center gap-4 px-6 py-3.5 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50 group"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800 text-lg">
                        {doc.file_extension === '.pdf' ? '📄' : doc.file_extension.includes('doc') ? '📝' : '🖼️'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-900 transition-colors group-hover:text-brand-600 dark:text-surface-50 dark:group-hover:text-brand-400">
                          {doc.original_filename}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {doc.category && (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                              {doc.category}
                            </span>
                          )}
                          <span className="text-xs text-surface-400">{formatBytes(doc.file_size)}</span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <DocumentStatusBadge status={doc.status} />
                        <div className="flex items-center gap-1 text-xs text-surface-400">
                          <Clock className="h-3.5 w-3.5" />
                          {timeAgo(doc.created_at)}
                        </div>
                        {statusIcon(doc.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="mb-3">
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      id={action.id}
                      onClick={() => navigate(action.path)}
                      className="flex flex-col items-center gap-2.5 rounded-xl border border-surface-100 dark:border-surface-700 p-4 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-surface-700 dark:text-surface-300 text-center leading-tight">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Summary */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="mb-3 flex flex-row items-center justify-between">
                <CardTitle>AI Performance</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Success rate</span>
                    <span className="font-semibold text-surface-900 dark:text-surface-100">
                      {totalDocs === 0 ? '—' : `${Math.round((aiDone / Math.max(totalDocs, 1)) * 100)}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                      style={{ width: `${totalDocs === 0 ? 0 : Math.round((aiDone / Math.max(totalDocs, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-surface-400">
                    {aiDone} of {totalDocs} documents fully processed
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── AI Widgets Row ────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


          {/* ── Category Distribution ── */}
          <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden shadow-sm">
            {/* Card header with gradient accent */}
            <div className="px-6 pt-5 pb-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-sm">
                    <BarChart3 className="h-4.5 w-4.5 text-white" style={{ height: '1.125rem', width: '1.125rem' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Category Distribution</h3>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">AI-classified document types</p>
                  </div>
                </div>
                {categoryEntries.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {categoryEntries.reduce((s, [, c]) => s + c, 0)}
                    <span className="font-normal text-brand-400">total</span>
                  </span>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 py-4">
              {recentLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-3 w-24 rounded bg-surface-100 dark:bg-surface-800" />
                        <div className="h-3 w-10 rounded bg-surface-100 dark:bg-surface-800" />
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-surface-100 dark:bg-surface-800" />
                    </div>
                  ))}
                </div>
              ) : categoryEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
                    <BarChart3 className="h-5 w-5 text-surface-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-600 dark:text-surface-400">No categories yet</p>
                    <p className="text-xs text-surface-400 mt-0.5">Upload and process documents to see classification</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {categoryEntries.map(([name, count], i) => {
                    const pct = Math.round((count / maxCat) * 100);
                    const totalAll = categoryEntries.reduce((s, [, c]) => s + c, 0);
                    const share = Math.round((count / totalAll) * 100);
                    return (
                      <div key={name} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {/* Colored dot indicator */}
                            <span
                              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                              style={{ background: ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#14b8a6'][i % 6] }}
                            />
                            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate max-w-[140px]">{name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-surface-400">{count} doc{count !== 1 ? 's' : ''}</span>
                            <span
                              className="text-xs font-semibold tabular-nums"
                              style={{ color: ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#14b8a6'][i % 6] }}
                            >
                              {share}%
                            </span>
                          </div>
                        </div>
                        {/* Animated progress bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${
                              [['#8b5cf6','#a78bfa'],['#06b6d4','#67e8f9'],['#10b981','#34d399'],
                               ['#f59e0b','#fcd34d'],['#f43f5e','#fb7185'],['#14b8a6','#2dd4bf']][i % 6].join(', ')
                            })` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Document Categories (Tag Cloud) ── */}
          <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="px-6 pt-5 pb-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-emerald-500 shadow-sm">
                    <Layers className="text-white" style={{ height: '1.125rem', width: '1.125rem' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Document Categories</h3>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">AI-generated classification tags</p>
                  </div>
                </div>
                {uniqueCategories.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 dark:bg-accent-950/40 px-2.5 py-1 text-xs font-semibold text-accent-600 dark:text-accent-400">
                    <Sparkles className="h-3 w-3" />
                    {uniqueCategories.length} types
                  </span>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 py-5">
              {recentLoading ? (
                <div className="flex flex-wrap gap-2 animate-pulse">
                  {[80, 64, 96, 72, 56, 88].map((w, i) => (
                    <div key={i} className="h-8 rounded-xl bg-surface-100 dark:bg-surface-800" style={{ width: `${w}px` }} />
                  ))}
                </div>
              ) : uniqueCategories.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
                    <Layers className="h-5 w-5 text-surface-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-600 dark:text-surface-400">No categories yet</p>
                    <p className="text-xs text-surface-400 mt-0.5">Categories appear after AI processing completes</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map((cat, i) => {
                    const docCount = categoryMap[cat] ?? 0;
                    const palettes = [
                      { bg: 'bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60', text: 'text-violet-700 dark:text-violet-300', dot: '#8b5cf6', badge: 'bg-violet-200/70 dark:bg-violet-800/60 text-violet-700 dark:text-violet-200' },
                      { bg: 'bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60', text: 'text-cyan-700 dark:text-cyan-300', dot: '#06b6d4', badge: 'bg-cyan-200/70 dark:bg-cyan-800/60 text-cyan-700 dark:text-cyan-200' },
                      { bg: 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60', text: 'text-emerald-700 dark:text-emerald-300', dot: '#10b981', badge: 'bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-200' },
                      { bg: 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60', text: 'text-amber-700 dark:text-amber-300', dot: '#f59e0b', badge: 'bg-amber-200/70 dark:bg-amber-800/60 text-amber-700 dark:text-amber-200' },
                      { bg: 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60', text: 'text-rose-700 dark:text-rose-300', dot: '#f43f5e', badge: 'bg-rose-200/70 dark:bg-rose-800/60 text-rose-700 dark:text-rose-200' },
                      { bg: 'bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60', text: 'text-teal-700 dark:text-teal-300', dot: '#14b8a6', badge: 'bg-teal-200/70 dark:bg-teal-800/60 text-teal-700 dark:text-teal-200' },
                    ];
                    const p = palettes[i % palettes.length];
                    return (
                      <motion.button
                        key={cat}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06, duration: 0.25 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/dashboard/documents')}
                        className={`inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 text-xs font-medium transition-colors ${p.bg} ${p.text}`}
                      >
                        {/* Colored bullet */}
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                        <span>{cat}</span>
                        {/* Doc count badge */}
                        <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${p.badge}`}>
                          {docCount}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Footer hint */}
              {uniqueCategories.length > 0 && (
                <button
                  onClick={() => navigate('/dashboard/documents')}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-200 dark:border-surface-700 py-2.5 text-xs text-surface-400 hover:text-brand-500 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  Browse all documents by category
                </button>
              )}
            </div>
          </div>


        </div>
      </motion.div>

      {/* ── AI Insight Banner ─────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 p-6 sm:p-8">
          <div className="absolute top-0 right-0 opacity-10">
            <Brain className="h-48 w-48 -translate-y-8 translate-x-8" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">AI Intelligence is active</h3>
              <p className="mt-1 text-sm text-brand-100">
                Every document you upload is automatically classified, tagged, and summarised.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="bg-white text-brand-700 hover:bg-brand-50 flex-shrink-0"
              id="upload-ai-now"
              onClick={() => navigate('/dashboard/upload')}
            >
              <Upload className="h-4 w-4" />
              Upload Now
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
