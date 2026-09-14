import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import type { QueuedBroadcast, WhatsAppLogRow } from "./whatsapp.types.js";

export const whatsappRepository = {
  async getQueuedBroadcasts(limit: number) {
    return query<(QueuedBroadcast & RowDataPacket)[]>(
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
      LIMIT ?
      `,
      [limit]
    );
  },

  async markBroadcastStatus(id: string, status: string, sentAt = false) {
    await query<ResultSetHeader>(
      `UPDATE broadcast_logs SET status = ?, sent_at = ${sentAt ? "NOW()" : "sent_at"} WHERE id = ?`,
      [status, id]
    );
  },

  async countSentToday() {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS total
      FROM broadcast_logs
      WHERE channel = 'whatsapp'
        AND status IN ('sent', 'dry_run')
        AND DATE(sent_at) = CURDATE()
      `
    );
    return Number(rows[0]?.total ?? 0);
  },

  async createWhatsAppLog(input: {
    gymId?: string | null;
    phone: string;
    templateName?: string | null;
    status: string;
    provider: string;
    metadata?: unknown;
  }) {
    await query<ResultSetHeader>(
      `
      INSERT INTO whatsapp_logs
      (id, gym_id, recipient_phone, template_name, status, provider, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
    return query<(WhatsAppLogRow & RowDataPacket)[]>(
      `
      SELECT *
      FROM whatsapp_logs
      WHERE gym_id = ? OR gym_id IS NULL
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [gymId, limit]
    );
  },

  async getExpiryTargets(gymId: string) {
    return query<RowDataPacket[]>(
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
      WHERE m.gym_id = ?
        AND m.status = 'active'
        AND u.phone IS NOT NULL
        AND m.expiry_date IS NOT NULL
        AND DATEDIFF(m.expiry_date, CURDATE()) BETWEEN 0 AND 5
      ORDER BY m.expiry_date ASC
      `,
      [gymId]
    );
  },

  async getChurnTargets(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT
        m.id,
        u.full_name AS name,
        u.phone,
        m.gym_id,
        MAX(a.attendance_date) AS last_visit,
        DATEDIFF(CURDATE(), MAX(a.attendance_date)) AS days_since_visit
      FROM members m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN attendance_sessions a ON a.member_id = m.id
      WHERE m.gym_id = ?
        AND m.status = 'active'
        AND u.phone IS NOT NULL
      GROUP BY m.id, u.full_name, u.phone, m.gym_id
      HAVING last_visit IS NULL OR days_since_visit >= 90
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
    await query<ResultSetHeader>(
      `
      INSERT INTO broadcast_logs
      (id, gym_id, lead_id, phone, message, campaign, channel, consent_verified, status)
      VALUES (?, ?, ?, ?, ?, ?, 'whatsapp', 1, 'queued')
      `,
      [makeId(), input.gymId, input.leadId ?? null, input.phone, input.message, input.campaign]
    );
  }
};