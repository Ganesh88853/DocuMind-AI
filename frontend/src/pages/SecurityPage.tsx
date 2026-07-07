/**
 * SecurityPage — Milestone 9 Security Settings
 *
 * Sections:
 *   1. Active Sessions (list devices, revoke individual or all)
 *   2. Change Password
 *   3. Login History (last 50 audit events)
 *   4. Two-Factor Authentication (coming soon placeholder)
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Monitor,
  Key,
  Clock,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Lock,
  Smartphone,
} from 'lucide-react';
import { securityService } from '@services/securityService';
import type { Session, AuditEvent } from '@/types/security';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN: { label: 'Login', color: 'text-emerald-500' },
  LOGIN_FAILED: { label: 'Failed Login', color: 'text-red-500' },
  LOGOUT: { label: 'Logout', color: 'text-surface-400' },
  LOGOUT_ALL: { label: 'Logout All Devices', color: 'text-orange-500' },
  REGISTER: { label: 'Account Created', color: 'text-brand-500' },
  PASSWORD_RESET_REQUESTED: { label: 'Password Reset Requested', color: 'text-yellow-500' },
  PASSWORD_RESET_COMPLETED: { label: 'Password Reset', color: 'text-orange-500' },
  PASSWORD_CHANGED: { label: 'Password Changed', color: 'text-orange-500' },
  EMAIL_VERIFIED: { label: 'Email Verified', color: 'text-emerald-500' },
  SESSION_REVOKED: { label: 'Session Revoked', color: 'text-red-400' },
  UPLOAD: { label: 'Document Uploaded', color: 'text-violet-500' },
  DELETE: { label: 'Document Deleted', color: 'text-red-400' },
  AI_CHAT: { label: 'AI Chat', color: 'text-blue-500' },
};

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function SessionCard({ session, onRevoke, isCurrent }: {
  session: Session;
  onRevoke: (id: string) => void;
  isCurrent: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
      isCurrent
        ? 'border-brand-200 bg-brand-50/50 dark:border-brand-800/40 dark:bg-brand-950/20'
        : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800/50'
    }`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        isCurrent ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-surface-100 dark:bg-surface-700'
      }`}>
        <Monitor className={`h-5 w-5 ${isCurrent ? 'text-brand-600 dark:text-brand-400' : 'text-surface-500'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-surface-900 truncate dark:text-surface-100">
            {session.device_hint || 'Unknown Device'}
          </p>
          {isCurrent && (
            <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              This device
            </span>
          )}
        </div>
        <p className="text-xs text-surface-400 mt-0.5">
          {session.ip_address || 'IP unknown'} · Last active {timeAgo(session.last_activity)}
        </p>
      </div>

      {!isCurrent && (
        <button
          id={`revoke-session-${session.id}`}
          onClick={() => onRevoke(session.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          title="Revoke session"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  const info = ACTION_LABELS[event.action] || { label: event.action, color: 'text-surface-400' };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-100 last:border-0 dark:border-surface-800">
      <div className={`w-2 h-2 rounded-full shrink-0 ${info.color.replace('text-', 'bg-')}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
        {event.ip_address && (
          <p className="text-xs text-surface-400 truncate">IP: {event.ip_address}</p>
        )}
      </div>
      <p className="text-xs text-surface-400 shrink-0">{timeAgo(event.timestamp)}</p>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */

export default function SecurityPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* Sessions */
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: securityService.getSessions,
  });

  const revokeSession = useMutation({
    mutationFn: securityService.revokeSession,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); showToast('Session revoked.'); },
    onError: () => showToast('Failed to revoke session.', 'err'),
  });

  const logoutAll = useMutation({
    mutationFn: securityService.logoutAll,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['sessions'] }); showToast(res.message); },
    onError: () => showToast('Failed to logout all sessions.', 'err'),
  });

  /* Audit log */
  const { data: auditEvents = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: securityService.getAuditLog,
  });

  /* Change password */
  const changePassword = useMutation({
    mutationFn: () => securityService.changePassword(currentPw, newPw),
    onSuccess: (res) => { showToast(res.message); setCurrentPw(''); setNewPw(''); },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to change password.', 'err'),
  });

  // Assume the first session in the list might be "this device" (most recent)
  const currentSessionId = sessions[0]?.id;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'ok'
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'ok' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Security Settings</h1>
            <p className="text-sm text-surface-400">Manage sessions, password, and account security.</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* ── Active Sessions ───────────────────────────────────────────── */}
          <section className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-surface-500" />
                <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Active Sessions</h2>
                {sessions.length > 0 && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {sessions.length}
                  </span>
                )}
              </div>
              {sessions.length > 1 && (
                <button
                  id="logout-all-btn"
                  onClick={() => logoutAll.mutate()}
                  disabled={logoutAll.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {logoutAll.isPending ? 'Logging out…' : 'Logout all devices'}
                </button>
              )}
            </div>

            {sessionsLoading ? (
              <div className="space-y-3">
                {[0, 1].map(i => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-100 dark:bg-surface-800" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-6">No active sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    isCurrent={s.id === currentSessionId}
                    onRevoke={(id) => revokeSession.mutate(id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Change Password ───────────────────────────────────────────── */}
          <section className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-900">
            <div className="mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-surface-500" />
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Change Password</h2>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-surface-500">Current Password</label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:ring-brand-900/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-surface-500">New Password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Min 8 chars, upper, lower, number, symbol"
                    className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:ring-brand-900/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="change-password-btn"
                onClick={() => changePassword.mutate()}
                disabled={!currentPw || !newPw || changePassword.isPending}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Lock className="h-4 w-4" />
                {changePassword.isPending ? 'Updating…' : 'Update Password'}
              </button>
              <p className="text-xs text-surface-400">
                Changing your password will log you out of all other devices.
              </p>
            </div>
          </section>

          {/* ── Login History ─────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-900">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-surface-500" />
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Security History</h2>
            </div>

            {auditLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-100 dark:bg-surface-800" />
                ))}
              </div>
            ) : auditEvents.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-6">No security events recorded yet.</p>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {auditEvents.map(e => <AuditRow key={e.id} event={e} />)}
              </div>
            )}
          </section>

          {/* ── 2FA Placeholder ───────────────────────────────────────────── */}
          <section className="rounded-2xl border border-dashed border-surface-300 bg-white p-6 dark:border-surface-700 dark:bg-surface-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800">
                <Smartphone className="h-5 w-5 text-surface-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
                    Two-Factor Authentication
                  </h2>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-surface-400 mt-0.5">
                  Add an extra layer of security with TOTP-based 2FA. Available in the next update.
                </p>
              </div>
            </div>
          </section>

          {/* ── Security Tips ─────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 dark:border-amber-900/30 dark:bg-amber-950/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Security Tips</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-500 list-disc list-inside">
                  <li>Never share your password with anyone, including DocuMind support.</li>
                  <li>Use a unique password you don't use on other sites.</li>
                  <li>Review your active sessions regularly and revoke any you don't recognise.</li>
                  <li>Enable 2FA when it becomes available for maximum security.</li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
