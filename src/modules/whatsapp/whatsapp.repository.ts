import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import type { QueuedBroadcast, WhatsAppLogRow } from "./whatsapp.types.js";

export const whatsappRepository = {
  async getQueuedBroadcasts(limit: number) {
    return query<(QueuedBroadcast & Record<string, unknown>)[]>(
      `
      SELECT
        b.*,
        l.status AS lead_status,
        l.consent_given AS lead_consent_given
      FROM broadcast_logs b
      LEFT JOIN leads l ON l.id = b.lead_id
      WHERE b.channel = 'whatsapp'
        AND b.status = 'queued'
      ORDER BY b.created_at ASC
      LIMIT $1
      `,
      [limit]
    );
  },

  async markBroadcastStatus(id: string, status: string, sentAt = false) {
    await query(
      `UPDATE broadcast_logs SET status = $1, sent_at = ${sentAt ? "NOW()" : "sent_at"} WHERE id = $2`,
      [status, id]
    );
  },

  async countSentToday() {
    const rows = await query(
      `
      SELECT COUNT(*) AS total
      FROM broadcast_logs
      WHERE channel = 'whatsapp'
        AND status IN ('sent', 'dry_run')
        AND DATE(sent_at) = CURRENT_DATE
      `
    );
    return Number((rows[0] as Record<string, unknown>)?.total ?? 0);
  },

  async createWhatsAppLog(input: {
    gymId?: string | null;
    phone: string;
    templateName?: string | null;
    status: string;
    provider: string;
    metadata?: unknown;
  }) {
    await query(
      `
      INSERT INTO whatsapp_logs
      (id, gym_id, recipient_phone, template_name, status, provider, metadata_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        makeId(),
        input.gymId ?? null,
        input.phone,
        input.templateName ?? null,
        input.status,
        input.provider,
        JSON.stringify(input.metadata ?? {})
      ]
    );
  },

  async listLogs(gymId: string, limit = 100) {
    return query<(WhatsAppLogRow & Record<string, unknown>)[]>(
      `
      SELECT *
      FROM whatsapp_logs
      WHERE gym_id = $1 OR gym_id IS NULL
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [gymId, limit]
    );
  },

  async getExpiryTargets(gymId: string) {
    return query(
      `
      SELECT
        m.id,
        u.full_name AS name,
        u.phone,
        m.gym_id,
        m.plan_name,
        m.expiry_date,
        COALESCE(p.price, 0) AS plan_amount
      FROM members m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN plans p ON p.gym_id = m.gym_id AND p.name = m.plan_name
      WHERE m.gym_id = $1
        AND m.status = 'active'
        AND u.phone IS NOT NULL
        AND m.expiry_date IS NOT NULL
        AND (m.expiry_date::date - CURRENT_DATE) BETWEEN 0 AND 5
      ORDER BY m.expiry_date ASC
      `,
      [gymId]
    );
  },

  async getChurnTargets(gymId: string) {
    return query(
      `
      SELECT
        m.id,
        u.full_name AS name,
        u.phone,
        m.gym_id,
        MAX(a.attendance_date) AS last_visit,
        (CURRENT_DATE - MAX(a.attendance_date)::date) AS days_since_visit
      FROM members m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN attendance_sessions a ON a.member_id = m.id
      WHERE m.gym_id = $1
        AND m.status = 'active'
        AND u.phone IS NOT NULL
      GROUP BY m.id, u.full_name, u.phone, m.gym_id
      HAVING MAX(a.attendance_date) IS NULL OR (CURRENT_DATE - MAX(a.attendance_date)::date) >= 90
      ORDER BY days_since_visit DESC
      LIMIT 200
      `,
      [gymId]
    );
  },

  async queueBroadcast(input: {
    gymId: string;
    leadId?: string | null;
    phone: string;
    message: string;
    campaign: string;
  }) {
    await query(
      `
      INSERT INTO broadcast_logs
      (id, gym_id, lead_id, phone, message, campaign, channel, consent_verified, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'whatsapp', TRUE, 'queued')
      `,
      [makeId(), input.gymId, input.leadId ?? null, input.phone, input.message, input.campaign]
    );
  }
};