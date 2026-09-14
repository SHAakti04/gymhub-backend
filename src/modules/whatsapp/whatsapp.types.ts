export type WhatsAppProviderName = "dry_run" | "evolution";

export type WhatsAppSendStatus =
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "dry_run"
  | "blocked_no_consent"
  | "blocked_daily_limit"
  | "blocked_opted_out";

export interface QueuedBroadcast {
  id: string;
  gym_id: string;
  lead_id: string | null;
  phone: string;
  message: string;
  campaign: string;
  channel: string;
  consent_verified: number;
  status: string;
  created_at: string;
  lead_status?: string | null;
  lead_consent_given?: number | null;
}

export interface WhatsAppTarget {
  id: string;
  name: string;
  phone: string;
  gymId: string;
  type: "expiry" | "churn" | "radius";
  planExpiry?: string;
  planAmount?: number;
  planName?: string;
  lastVisit?: string;
  daysSinceVisit?: number;
  distance?: number | null;
  area?: string;
  interest?: string;
}

export interface WhatsAppTemplate {
  id: string;
  campaign: "5-day-expiry" | "3-month-churn" | "5km-radius";
  name: string;
  body: string;
  variables: string[];
}

export interface WhatsAppLogRow {
  id: string;
  gym_id: string | null;
  recipient_phone: string;
  template_name: string | null;
  status: string;
  provider: string | null;
  metadata_json: unknown;
  created_at: string;
}

export interface WhatsAppProvider {
  getStatus(): Promise<Record<string, unknown>>;
  sendText(input: { to: string; message: string }): Promise<{
    providerMessageId?: string;
    raw?: unknown;
  }>;
}