/**
 * Unit tests for themeStore (Zustand).
 * @vitest-environment jsdom
 *
 * Tests:
 * - Initial theme is 'system'
 * - setTheme to 'dark' updates resolvedTheme
 * - setTheme to 'light' updates resolvedTheme
 * - setTheme adds/removes dark class on documentElement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from './themeStore'

function resetThemeStore() {
  useThemeStore.setState({ theme: 'system', resolvedTheme: 'light' })
}

describe('useThemeStore', () => {
  beforeEach(() => {
    resetThemeStore()
    // Reset document class
    document.documentElement.classList.remove('dark')
  })

  describe('initial state', () => {
    it('defaults to system theme', () => {
      expect(useThemeStore.getState().theme).toBe('system')
    })

    it('has a resolved theme', () => {
      const { resolvedTheme } = useThemeStore.getState()
      expect(['light', 'dark']).toContain(resolvedTheme)
    })
  })

  describe('setTheme', () => {
    it('sets theme to dark', () => {
      useThemeStore.getState().setTheme('dark')
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('sets resolvedTheme to dark when theme=dark', () => {
      useThemeStore.getState().setTheme('dark')
      expect(useThemeStore.getState().resolvedTheme).toBe('dark')
    })

    it('adds dark class to documentElement when dark', () => {
      useThemeStore.getState().setTheme('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('sets theme to light', () => {
      useThemeStore.getState().setTheme('light')
      expect(useThemeStore.getState().theme).toBe('light')
    })

    it('sets resolvedTheme to light when theme=light', () => {
      useThemeStore.getState().setTheme('light')
      expect(useThemeStore.getState().resolvedTheme).toBe('light')
    })

    it('removes dark class when switching to light', () => {
      useThemeStore.getState().setTheme('dark')
      useThemeStore.getState().setTheme('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('sets theme to system', () => {
      useThemeStore.getState().setTheme('dark')
      useThemeStore.getState().setTheme('system')
      expect(useThemeStore.getState().theme).toBe('system')
    })
  })

  describe('updateResolvedTheme', () => {
    it('can be called without error', () => {
      expect(() => useThemeStore.getState().updateResolvedTheme()).not.toThrow()
    })

    it('updates resolvedTheme based on current theme', () => {
      useThemeStore.setState({ theme: 'dark' })
      useThemeStore.getState().updateResolvedTheme()
      expect(useThemeStore.getState().resolvedTheme).toBe('dark')
    })
  })
})
