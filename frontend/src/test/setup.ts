/**
 * Vitest global test setup.
 *
 * IMPORTANT: matchMedia must be patched at module load time (before any
 * store imports) because themeStore calls window.matchMedia during
 * module initialization.
 *
 * All mocks run before test files import anything.
 */

// ── 1. Patch matchMedia (runs synchronously at import time) ──────────────────
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// ── 2. jest-dom matchers ──────────────────────────────────────────────────────
import '@testing-library/jest-dom'

// ── 3. Cleanup after each test ────────────────────────────────────────────────
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// ── 4. Other globals jsdom doesn't implement ──────────────────────────────────
import { vi } from 'vitest'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  root: null,
  rootMargin: '',
  thresholds: [],
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
