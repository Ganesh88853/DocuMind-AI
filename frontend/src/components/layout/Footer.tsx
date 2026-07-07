/**
 * Footer — site footer used in the public (landing) layout.
 * Contains branding, navigation columns, and legal links.
 */

import { Link } from 'react-router-dom';
import { Brain, ExternalLink, Code2, Globe } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Status', href: '#' },
    { label: 'Support', href: '#' },
  ],
};

const socialLinks = [
  { icon: ExternalLink, label: 'Twitter', href: '#' },
  { icon: Code2, label: 'GitHub', href: '#' },
  { icon: Globe, label: 'LinkedIn', href: '#' },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900">
      <div className="section-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow-sm">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">
                <span className="gradient-text">DocuMind</span>
                <span className="text-surface-700 dark:text-surface-200"> AI</span>
              </span>
            </Link>
            <p className="text-sm text-surface-500 dark:text-surface-400 max-w-xs leading-relaxed">
              Your AI-powered document assistant that understands your files.
              Stop searching. Start asking.
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 text-surface-500 hover:border-brand-400 hover:text-brand-600 dark:border-surface-700 dark:text-surface-400 dark:hover:border-brand-500 dark:hover:text-brand-400 transition-all duration-200"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 transition-colors duration-150"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-400 dark:text-surface-500">
            © {new Date().getFullYear()} DocuMind AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs text-surface-400 hover:text-surface-700 dark:text-surface-500 dark:hover:text-surface-300 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
