/**
 * Security-related TypeScript types for Milestone 9.
 */

export interface Session {
  id: string;
  ip_address: string | null;
  device_hint: string | null;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface AuditEvent {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  extra_data: Record<string, unknown> | null;
  timestamp: string;
}
