/**
 * Unit tests for authStore (Zustand).
 *
 * Tests:
 * - Initial state
 * - setAuth persists user and tokens
 * - clearAuth resets everything
 * - setLoading toggling
 * - setUser updates user in place
 * - isAuthenticated flag reflects state
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

// Reset store state between tests to ensure isolation
function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  })
}

const mockTokenResponse = {
  access_token: 'eyJmYWtl.YWNjZXNz.dG9rZW4',
  refresh_token: 'eyJmYWtl.cmVmcmVzaA.dG9rZW4',
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    is_active: true,
    is_verified: true,
    role: 'user',
    created_at: '2024-01-01T00:00:00Z',
    profile_image: null,
  },
}

describe('useAuthStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with no user', () => {
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('starts with no access token', () => {
      expect(useAuthStore.getState().accessToken).toBeNull()
    })

    it('starts not authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('starts not loading', () => {
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('setAuth', () => {
    it('sets user from token response', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      expect(useAuthStore.getState().user?.email).toBe('test@example.com')
    })

    it('sets access token', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      expect(useAuthStore.getState().accessToken).toBe(mockTokenResponse.access_token)
    })

    it('sets refresh token', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      expect(useAuthStore.getState().refreshToken).toBe(mockTokenResponse.refresh_token)
    })

    it('marks as authenticated', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('clears loading flag', () => {
      useAuthStore.setState({ isLoading: true })
      useAuthStore.getState().setAuth(mockTokenResponse)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('clearAuth', () => {
    it('clears user', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('clears tokens', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(useAuthStore.getState().refreshToken).toBeNull()
    })

    it('marks as not authenticated', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)
    })

    it('sets isLoading to false', () => {
      useAuthStore.setState({ isLoading: true })
      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('setUser', () => {
    it('updates user while preserving tokens', () => {
      useAuthStore.getState().setAuth(mockTokenResponse)
      const updatedUser = { ...mockTokenResponse.user, full_name: 'Updated Name' }
      useAuthStore.getState().setUser(updatedUser)
      expect(useAuthStore.getState().user?.full_name).toBe('Updated Name')
      expect(useAuthStore.getState().accessToken).toBe(mockTokenResponse.access_token)
    })
  })
})
