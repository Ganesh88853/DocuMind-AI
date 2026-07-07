/**
 * AppRouter — centralized application routing.
 * Uses React Router v6 with lazy-loaded page components for code splitting.
 * Dashboard routes are wrapped in ProtectedRoute — requires authentication.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '@layouts/PublicLayout';
import { RootLayout } from '@layouts/RootLayout';
import { PageLoader } from '@components/ui/LoadingSpinner';
import { ProtectedRoute } from '@components/auth/ProtectedRoute';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@pages/LandingPage'));
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const LoginPage = lazy(() => import('@pages/LoginPage'));
const RegisterPage = lazy(() => import('@pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@pages/ForgotPasswordPage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));

// ── Milestone 3 — Document pages ──────────────────────────────────────────────
const DocumentsPage = lazy(() => import('@pages/DocumentsPage'));
const UploadPage = lazy(() => import('@pages/UploadPage'));
const DocumentDetailPage = lazy(() => import('@pages/DocumentDetailPage'));

// ── Milestone 6 — Semantic Search ─────────────────────────────────────────────
const SearchPage = lazy(() => import('@pages/SearchPage'));

// ── Milestone 7 — AI Assistant ────────────────────────────────────────────────
const AssistantPage = lazy(() => import('@pages/AssistantPage'));

// ── Milestone 9 — Security Settings ───────────────────────────────────────────
const SecurityPage = lazy(() => import('@pages/SecurityPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <SuspenseWrapper>
        <Routes>
          {/* ── Public / Marketing ──────────────────────────────────────── */}
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
          </Route>

          {/* ── Auth Pages (no Navbar/Footer wrapper) ───────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* ── Protected Dashboard ─────────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RootLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />

            {/* Document routes */}
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="upload" element={<UploadPage />} />

            {/* Placeholder routes — sidebar links */}
            <Route path="favorites" element={<DocumentsPage />} />
            {/* categories redirects to dashboard — no dedicated page yet */}
            <Route path="categories" element={<Navigate to="/dashboard" replace />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="settings" element={<Navigate to="/dashboard" replace />} />

            {/* Catch-all: unknown /dashboard/* paths redirect to dashboard home */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* ── 404 ─────────────────────────────────────────────────────── */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />

        </Routes>
      </SuspenseWrapper>
    </BrowserRouter>
  );
}
