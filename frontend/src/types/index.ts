/**
 * Shared TypeScript types and interfaces for DocuMind AI.
 * Future milestones will expand these types as features are added.
 */

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
}

// ─── Document (placeholder — expanded in Milestone 2) ────────────────────────

export interface Document {
  id: string;
  title: string;
  type: string;
  size: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  isFavorite?: boolean;
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
}
