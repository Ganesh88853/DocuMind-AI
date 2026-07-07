/**
 * Security service — API calls for Milestone 9 security features.
 */

import apiClient from './api';
import type { Session, AuditEvent } from '@/types/security';

const BASE = '/api/v1/auth';

export const securityService = {
  /** List active sessions for current user */
  getSessions: async (): Promise<Session[]> => {
    const res = await apiClient.get<Session[]>(`${BASE}/sessions`);
    return res.data;
  },

  /** Revoke a specific session */
  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/sessions/${sessionId}`);
  },

  /** Logout from all devices */
  logoutAll: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>(`${BASE}/logout-all`);
    return res.data;
  },

  /** Get security audit log for current user */
  getAuditLog: async (): Promise<AuditEvent[]> => {
    const res = await apiClient.get<AuditEvent[]>(`${BASE}/audit-log`);
    return res.data;
  },

  /** Change password */
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>(`${BASE}/password/change`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return res.data;
  },

  /** Request password reset email */
  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>(`${BASE}/password-reset/request`, { email });
    return res.data;
  },

  /** Resend email verification */
  resendVerification: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>(`${BASE}/email/resend`);
    return res.data;
  },
};
