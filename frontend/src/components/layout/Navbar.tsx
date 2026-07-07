/**
 * Navbar — top navigation bar used in the public layout (landing page).
 * Shows different CTAs depending on authentication state.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Brain, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { ThemeToggle } from '@components/ThemeToggle';
import { cn } from '@utils/cn';
import { useAuthStore } from '@store/authStore';
import { authService } from '@services/authService';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

/** Generate user initials from full name, e.g. "Jane Doe" → "JD" */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, clearAuth } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setShowUserMenu(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore server errors — client always clears state
    } finally {
      clearAuth();
      navigate('/', { replace: true });
    }
  };

  const initials = user ? getInitials(user.full_name) : 'U';

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'glass dark:glass-dark border-b border-white/10 shadow-glass'
          : 'bg-transparent'
      )}
    >
      <div className="section-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            aria-label="DocuMind AI Home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow-sm group-hover:shadow-glow-md transition-shadow duration-300">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">
              <span className="gradient-text">DocuMind</span>
              <span className="text-surface-700 dark:text-surface-200"> AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100/80 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800/80 dark:hover:text-surface-100 transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated && user ? (
              /* ── Authenticated state ─────────────────────────────────── */
              <div className="relative">
                <button
                  id="navbar-user-menu"
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  aria-label="User menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white text-xs font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-200 max-w-[120px] truncate">
                    {user.full_name}
                  </span>
                </button>

                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-2xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700">
                      <p className="text-xs text-surface-400 truncate">Signed in as</p>
                      <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-200 dark:hover:bg-surface-700 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-brand-500" />
                        Dashboard
                      </Link>
                      <button
                        id="navbar-logout"
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
            ) : (
              /* ── Guest state ─────────────────────────────────────────── */
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button variant="gradient" size="sm" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
              className="rounded-xl p-2 text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 transition-colors"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="glass dark:glass-dark border-t border-white/10 md:hidden"
        >
          <div className="section-container py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-surface-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="md" className="w-full" asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="md" className="w-full" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button variant="gradient" size="md" className="w-full" asChild>
                    <Link to="/register">Get Started Free</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
