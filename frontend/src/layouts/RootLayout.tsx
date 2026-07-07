/**
 * RootLayout — authenticated dashboard shell.
 * Includes the collapsible Sidebar, top Dashboard Navbar, and main content area.
 * Shows real user data from the auth store.
 */

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { Sidebar } from '@components/layout/Sidebar';
import { ThemeToggle } from '@components/ThemeToggle';
import { useUIStore } from '@store/uiStore';
import { useAuthStore } from '@store/authStore';
import { authService } from '@services/authService';
import { cn } from '@utils/cn';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function RootLayout() {
  const { isMobileMenuOpen, toggleMobileMenu } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const [hasNotifications] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const initials = user ? getInitials(user.full_name) : 'U';
  const displayName = user?.full_name ?? 'User';
  const displayEmail = user?.email ?? '';

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Server errors are non-critical — always clear client state
    } finally {
      clearAuth();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-[#020617]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <Sidebar mobile />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Dashboard Top Bar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-surface-200 bg-white px-4 sm:px-6 dark:border-surface-700 dark:bg-surface-900">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              id="mobile-sidebar-toggle"
              onClick={toggleMobileMenu}
              className="lg:hidden rounded-xl p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global search bar — navigates to the dedicated Search page */}
            <div className="hidden sm:flex relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-surface-400" />
              </div>
              <input
                id="dashboard-search"
                type="search"
                placeholder="Search documents…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    navigate('/dashboard/search');
                  }
                }}
                onClick={() => navigate('/dashboard/search')}
                readOnly
                className={cn(
                  'w-64 cursor-pointer rounded-xl border border-surface-200 bg-surface-50 py-2 pl-9 pr-4',
                  'text-sm text-surface-900 placeholder-surface-400 outline-none',
                  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                  'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder-surface-500',
                  'transition-all duration-200'
                )}
              />
            </div>

          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              id="notifications-button"
              className="relative rounded-xl p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-surface-900" />
              )}
            </button>

            {/* User Avatar + Dropdown */}
            <div className="relative">
              <button
                id="user-avatar"
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white text-xs font-semibold ring-2 ring-transparent hover:ring-brand-300 transition-all duration-200"
                aria-label="User profile menu"
              >
                {initials}
              </button>

              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700">
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-surface-400 truncate mt-0.5">{displayEmail}</p>
                  </div>
                  <div className="py-1">
                    <button
                      id="dashboard-logout"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={cn('flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide')}
          id="main-content"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
