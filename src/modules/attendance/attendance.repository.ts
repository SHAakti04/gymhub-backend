import { query, execute } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import { istDateKey, istTimeKey } from "../../common/utils/date.util.js";

const MOTIVATION_MESSAGES = [
  "Every workout you miss is a step away from your goal. Show up stronger tomorrow.",
  "Small consistency beats big excuses. We are cheering for your comeback tomorrow.",
  "Your future self will thank you for one more workout. Let us get back in tomorrow.",
  "Progress is built one session at a time. Do not miss tomorrow's win.",
];

export const attendanceRepository = {
  async getDailyQr(gymId: string, date = istDateKey()) {
    const rows = await query(
      "SELECT * FROM daily_qr_codes WHERE gym_id = $1 AND qr_date = $2 LIMIT 1",
      [gymId, date],
    );
    return rows[0] ?? null;
  },

  async upsertDailyQr(input: { gymId: string; code: string; generatedByUserId: string | null }) {
    const existing = await this.getDailyQr(input.gymId);
    if (existing) {
      await query(
        "UPDATE daily_qr_codes SET code = $1, generated_by_user_id = $2, created_at = NOW() WHERE id = $3",
        [input.code, input.generatedByUserId, (existing as Record<string, unknown>).id],
      );
      return this.getDailyQr(input.gymId);
    }

    await query(
      "INSERT INTO daily_qr_codes (id, gym_id, qr_date, code, generated_by_user_id) VALUES ($1, $2, $3, $4, $5)",
      [makeId(), input.gymId, istDateKey(), input.code, input.generatedByUserId],
    );
    return this.getDailyQr(input.gymId);
  },

  async getTodayAttendance(gymId: string) {
    return query(
      "SELECT * FROM attendance_sessions WHERE gym_id = $1 AND attendance_date = $2 ORDER BY created_at DESC",
      [gymId, istDateKey()],
    );
  },

  async findActiveMember(memberId: string, gymId: string) {
    const rows = await query(
      `
      SELECT id, gym_id, status
      FROM members
      WHERE id = $1
        AND gym_id = $2
        AND status = 'active'
      LIMIT 1
      `,
      [memberId, gymId],
    );
    return rows[0] ?? null;
  },

  async getOpenSession(memberId: string) {
    const rows = await query(
      "SELECT * FROM attendance_sessions WHERE member_id = $1 AND attendance_date = $2 LIMIT 1",
      [memberId, istDateKey()],
    );
    return rows[0] ?? null;
  },

  async createCheckIn(input: { memberId: string; gymId: string; qrCode: string; source: string }) {
    await query(
      `
      INSERT INTO attendance_sessions (id, member_id, gym_id, attendance_date, check_in_time, qr_code, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [makeId(), input.memberId, input.gymId, istDateKey(), istTimeKey(), input.qrCode, input.source],
    );
    return this.getOpenSession(input.memberId);
  },

  async completeCheckOut(memberId: string) {
    await query(
      "UPDATE attendance_sessions SET check_out_time = $1 WHERE member_id = $2 AND attendance_date = $3",
      [istTimeKey(), memberId, istDateKey()],
    );
    return this.getOpenSession(memberId);
  },

  async getAbsentToday(gymId: string) {
    return query(
      `
      SELECT m.id, u.full_name, u.email, u.phone, m.plan_name, m.status
      FROM members m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN attendance_sessions a
        ON a.member_id = m.id AND a.attendance_date = $1
      WHERE m.gym_id = $2
        AND m.status = 'active'
        AND a.id IS NULL
      ORDER BY u.full_name ASC
      `,
      [istDateKey(), gymId],
    );
  },

  async queueAbsenceReminders(gymId: string, date = istDateKey()) {
    const absent = await this.getAbsentToday(gymId);
    let queued = 0;
    let skippedNoPhone = 0;

    for (const [index, member] of absent.entries()) {
      const m = member as Record<string, unknown>;
      const motivation = MOTIVATION_MESSAGES[index % MOTIVATION_MESSAGES.length];
      const phone = String(m.phone ?? "").trim();
      const reminderStatus = phone ? "queued" : "skipped_no_phone";

      const result = await execute(
        `
        INSERT INTO absence_reminders
          (id, member_id, gym_id, reminder_date, status, recipient_email, email_status, motivation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (member_id, reminder_date) DO NOTHING
        `,
        [
          makeId(),
          m.id,
          gymId,
          date,
          reminderStatus,
          m.email,
          reminderStatus,
          motivation,
        ],
      );

      if (result.rowCount === 0) {
        continue;
      }

      if (!phone) {
        skippedNoPhone += 1;
        continue;
      }

      await query(
        `
        INSERT INTO broadcast_logs
          (id, gym_id, lead_id, phone, message, campaign, channel, consent_verified, status)
        VALUES ($1, $2, NULL, $3, $4, 'daily-absence-motivation', 'whatsapp', TRUE, 'queued')
        `,
        [
          makeId(),
          gymId,
          phone,
          `Hi ${m.full_name}, we missed you at the gym today. ${motivation}`,
        ],
      );

      queued += 1;
    }

    return { queued, skippedNoPhone };
  },

  async listAbsenceReminders(gymId: string, date = istDateKey()) {
    return query(
      `
      SELECT ar.*, u.full_name AS member_name, u.email, u.phone, m.plan_name
      FROM absence_reminders ar
      JOIN members m ON m.id = ar.member_id
      JOIN users u ON u.id = m.user_id
      WHERE ar.gym_id = $1 AND ar.reminder_date = $2
      ORDER BY ar.created_at DESC
      `,
      [gymId, date],
    );
  },

  async listActiveGyms() {
    return query(
      "SELECT id, name FROM gyms WHERE status = 'active' ORDER BY created_at ASC",
    );
  },
};