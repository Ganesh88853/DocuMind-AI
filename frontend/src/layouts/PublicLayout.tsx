/**
 * PublicLayout — wraps public-facing pages (landing, auth, etc.)
 * Includes the top Navbar and Footer.
 */

import { Outlet } from 'react-router-dom';
import { Navbar } from '@components/layout/Navbar';
import { Footer } from '@components/layout/Footer';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-50 dark:bg-[#020617]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
