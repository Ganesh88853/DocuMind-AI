/// <reference types="vite/client" />

/**
 * Axios API client with auth token injection and 401 refresh interceptor.
 * On a 401 response, attempts one token refresh before failing.
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor — inject access token ────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read token from persisted Zustand store in localStorage
    try {
      const raw = localStorage.getItem('documind-auth');
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
        const token = parsed?.state?.accessToken;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Ignore parse errors — request proceeds without token
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─── Response Interceptor — handle 401 with one refresh attempt ───────────────
let _isRefreshing = false;
let _failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  _failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  _failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Attempt token refresh
    if (_isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        _failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    _isRefreshing = true;

    try {
      const raw = localStorage.getItem('documind-auth');
      if (!raw) throw new Error('No auth state');

      const parsed = JSON.parse(raw) as { state?: { refreshToken?: string } };
      const refreshToken = parsed?.state?.refreshToken;
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post<{ access_token: string; refresh_token: string; user: unknown }>(
        `${BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken }
      );

      // Update persisted store with new tokens
      const currentState = JSON.parse(raw) as { state?: Record<string, unknown> };
      if (currentState.state) {
        currentState.state.accessToken = data.access_token;
        currentState.state.refreshToken = data.refresh_token;
        currentState.state.user = data.user;
        localStorage.setItem('documind-auth', JSON.stringify(currentState));
      }

      processQueue(null, data.access_token);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear auth state on refresh failure — force re-login
      localStorage.removeItem('documind-auth');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default apiClient;
