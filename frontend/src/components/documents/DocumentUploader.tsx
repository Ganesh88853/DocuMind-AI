/**
 * DocumentUploader — drag-and-drop file upload widget with progress, validation, and success states.
 */

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle2, AlertCircle, FileText, Image, File, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/documentService';
import type { UploadItem } from '@/types/document';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
const MAX_SIZE = 20 * 1024 * 1024;

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image className="h-5 w-5 text-violet-500" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-blue-500" />;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function DocumentUploader() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) return `File too large (max 20 MB, got ${formatBytes(file.size)})`;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return `Unsupported type: ${ext}. Allowed: PDF, DOC, DOCX, PNG, JPG`;
    return null;
  };

  const uploadFile = useCallback(async (item: UploadItem) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i));
    try {
      const doc = await documentService.upload(item.file, (pct) => {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, progress: pct } : i));
      });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'done', progress: 100, document: doc } : i));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed';
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'error', error: msg } : i));
    }
  }, [queryClient]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: UploadItem[] = arr.map((file) => {
      const error = validateFile(file);
      return { id: crypto.randomUUID(), file, progress: 0, status: error ? 'error' : 'pending', error: error ?? undefined };
    });
    setItems((prev) => [...prev, ...newItems]);
    newItems.filter((i) => i.status === 'pending').forEach(uploadFile);
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        animate={{ borderColor: dragging ? 'rgb(99 102 241)' : 'rgb(226 232 240)', scale: dragging ? 1.01 : 1 }}
        transition={{ duration: 0.15 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
                   border-surface-300 bg-surface-50 px-6 py-16 transition-all
                   hover:border-brand-400 hover:bg-brand-50/30
                   dark:border-surface-600 dark:bg-surface-800/40 dark:hover:border-brand-500 dark:hover:bg-brand-950/20"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors
          ${dragging ? 'bg-brand-100 dark:bg-brand-900/50' : 'bg-white shadow-sm dark:bg-surface-700'}`}>
          <Upload className={`h-8 w-8 transition-colors ${dragging ? 'text-brand-600' : 'text-surface-400'}`} />
        </div>

        <div className="text-center">
          <p className="mb-1 text-base font-semibold text-surface-900 dark:text-surface-100">
            {dragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-surface-500">or <span className="text-brand-600 dark:text-brand-400 font-medium">browse</span> to choose files</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['PDF', 'DOCX', 'DOC', 'PNG', 'JPG'].map((t) => (
            <span key={t} className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-medium text-surface-500 dark:border-surface-600 dark:bg-surface-700">
              {t}
            </span>
          ))}
        </div>
        <p className="text-xs text-surface-400">Maximum file size: 20 MB</p>
      </motion.div>

      {/* Upload items */}
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-3
                       dark:border-surface-700 dark:bg-surface-900"
          >
            {/* File icon */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-50 dark:bg-surface-800">
              {fileIcon(item.file.type)}
            </div>

            {/* Info + progress */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">{item.file.name}</p>
                <span className="flex-shrink-0 text-xs text-surface-500">{formatBytes(item.file.size)}</span>
              </div>

              {item.status === 'uploading' && (
                <div className="mt-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
                    <motion.div
                      animate={{ width: `${item.progress}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-surface-500">{item.progress}%</p>
                </div>
              )}

              {item.status === 'done' && (
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">Uploaded successfully</p>
              )}

              {item.status === 'error' && (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{item.error}</p>
              )}
            </div>

            {/* Status icon */}
            <div className="flex-shrink-0">
              {item.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
              {item.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
            </div>

            {/* Remove */}
            {item.status !== 'uploading' && (
              <button
                onClick={() => removeItem(item.id)}
                className="flex-shrink-0 rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
