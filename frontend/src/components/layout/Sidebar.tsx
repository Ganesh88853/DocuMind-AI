/**
 * Sidebar — collapsible navigation sidebar for the dashboard layout.
 * Supports icon-only collapsed state and mobile overlay mode.
 */

import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  LayoutDashboard,
  FileText,
  Star,
  FolderOpen,
  Search,
  MessageSquareDashed,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
} from 'lucide-react';
import { useUIStore } from '@store/uiStore';
import { cn } from '@utils/cn';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Documents', href: '/dashboard/documents' },
  { icon: Upload, label: 'Upload', href: '/dashboard/upload' },
  { icon: Star, label: 'Favorites', href: '/dashboard/favorites' },
  { icon: FolderOpen, label: 'Categories', href: '/dashboard/categories' },
  { icon: Search, label: 'Search', href: '/dashboard/search' },
  { icon: MessageSquareDashed, label: 'AI Assistant', href: '/dashboard/assistant' },
];

const bottomItems = [
  { icon: Shield, label: 'Security', href: '/dashboard/security' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

interface SidebarProps {
  mobile?: boolean;
}

export function Sidebar({ mobile = false }: SidebarProps) {
  const location = useLocation();
  const { isSidebarOpen, toggleSidebar, setMobileMenuOpen } = useUIStore();
  const isOpen = mobile ? true : isSidebarOpen;

  const isActive = (href: string) => {
    // Root dashboard — exact match only (avoid matching all /dashboard/* routes)
    if (href === '/dashboard') return location.pathname === '/dashboard';
    // All others — highlight when the current path starts with the nav item's href
    return location.pathname.startsWith(href);
  };


  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 240 : 72 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={cn(
          'relative flex flex-col h-full border-r',
          'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900',
          mobile && 'fixed left-0 top-0 z-50 h-screen shadow-2xl w-60'
        )}
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5 overflow-hidden"
              >
                <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                  <Brain className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-sm whitespace-nowrap">
                  <span className="gradient-text">DocuMind</span>
                  <span className="text-surface-700 dark:text-surface-200"> AI</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isOpen && (
            <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
          )}

          {/* Close button for mobile, collapse for desktop */}
          {mobile ? (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              id="sidebar-toggle"
              onClick={toggleSidebar}
              className={cn(
                'rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors',
                !isOpen && 'hidden'
              )}
              aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {!isOpen && !mobile && (
          <button
            id="sidebar-expand"
            onClick={toggleSidebar}
            className="absolute -right-3 top-[4.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-surface-200 bg-white shadow-sm dark:border-surface-600 dark:bg-surface-800 text-surface-500 hover:text-brand-600 transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 px-2 scrollbar-hide" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100',
                  !isOpen && !mobile && 'justify-center px-2'
                )}
                title={!isOpen ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 h-5 w-5',
                    active ? 'text-brand-600 dark:text-brand-400' : ''
                  )}
                />
                <AnimatePresence mode="wait">
                  {(isOpen || mobile) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Items */}
        <div className="border-t border-surface-200 dark:border-surface-700 py-4 px-2 space-y-1">
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
                'dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100',
                'transition-all duration-150',
                !isOpen && !mobile && 'justify-center px-2'
              )}
              title={!isOpen ? item.label : undefined}
            >
              <item.icon className="flex-shrink-0 h-5 w-5" />
              <AnimatePresence mode="wait">
                {(isOpen || mobile) && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ))}
        </div>
      </motion.aside>
    </>
  );
}
