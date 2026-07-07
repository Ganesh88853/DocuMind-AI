/**
 * Authentication-related TypeScript types for DocuMind AI.
 * These mirror the Pydantic schemas on the backend exactly.
 */

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  full_name: string;
  email: string;
  profile_image: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

// ─── Auth Payloads ────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

// ─── Store State ──────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (tokens: TokenResponse) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: User) => void;
}
