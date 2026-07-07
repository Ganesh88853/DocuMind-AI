/// <reference types="vite/client" />

/**
 * Auth service — all HTTP calls to /api/v1/auth/* endpoints.
 * Uses the shared apiClient from api.ts. Token refresh is handled
 * via an Axios response interceptor wired in api.ts.
 */

import apiClient from './api';
import type {
  LoginCredentials,
  RegisterData,
  TokenResponse,
  MessageResponse,
  User,
} from '../types/auth';

export const authService = {
  /** Register a new user account. Returns tokens + user on success. */
  register: async (data: RegisterData): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(
      '/api/v1/auth/register',
      data
    );
    return response.data;
  },

  /** Login with email + password. Returns tokens + user on success. */
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(
      '/api/v1/auth/login',
      credentials
    );
    return response.data;
  },

  /** Exchange a refresh token for a new access + refresh pair. */
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken }
    );
    return response.data;
  },

  /** Fetch the currently authenticated user's profile. */
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/v1/auth/me');
    return response.data;
  },

  /** Logout — server-side acknowledgement only. Client must clear tokens. */
  logout: async (): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/api/v1/auth/logout');
    return response.data;
  },
};
