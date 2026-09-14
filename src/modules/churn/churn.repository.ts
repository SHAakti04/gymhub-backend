import type { RowDataPacket } from "mysql2";
import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export interface ChurnMetricRow extends RowDataPacket {
  member_id: string;
  gym_id: string;
  member_name: string;
  email: string | null;
  phone: string | null;
  plan_name: string | null;
  last_visit: string | null;
  days_since_visit: number | null;
  visits_last_7d: number;
  visits_last_30d: number;
}

export interface PersistedChurnScore {
  memberId: string;
  gymId: string;
  score: number;
  riskBand: "high" | "medium" | "low";
  daysSinceVisit: number;
  visitsLast7d: number;
  visitsLast30d: number;
  reasonJson: string;
}

export const churnRepository = {
  async listActiveGyms() {
    return query<RowDataPacket[]>(
      "SELECT id, name FROM gyms WHERE status = 'active' ORDER BY created_at ASC",
    );
  },

  async getMemberMetrics(gymId: string) {
    return query<ChurnMetricRow[]>(
      `
      SELECT
        m.id AS member_id,
        m.gym_id,
        u.full_name AS member_name,
        u.email,
        u.phone,
        m.plan_name,
        MAX(a.attendance_date) AS last_visit,
        DATEDIFF(CURDATE(), MAX(a.attendance_date)) AS days_since_visit,
        COALESCE(SUM(CASE WHEN a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END), 0) AS visits_last_7d,
        COALESCE(SUM(CASE WHEN a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) AS visits_last_30d
      FROM members m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN attendance_sessions a ON a.member_id = m.id
      WHERE m.gym_id = ?
        AND m.status = 'active'
      GROUP BY
        m.id,
        m.gym_id,
        u.full_name,
        u.email,
        u.phone,
        m.plan_name
      ORDER BY u.full_name ASC
      `,
      [gymId],
    );
  },

  async replaceScoresForGym(gymId: string, scores: PersistedChurnScore[]) {
    return withTransaction(async (connection) => {
      await connection.execute("DELETE FROM churn_scores WHERE gym_id = ?", [gymId]);

      for (const score of scores) {
        await connection.execute(
          `
          INSERT INTO churn_scores
          (id, member_id, gym_id, score, risk_band, days_since_visit, visits_last_7d, visits_last_30d, reason_json, calculated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `,
          [
            makeId(),
            score.memberId,
            score.gymId,
            score.score,
            score.riskBand,
            score.daysSinceVisit,
            score.visitsLast7d,
            score.visitsLast30d,
            score.reasonJson,
          ],
        );
      }

      return { members: scores.length };
    });
  },

  async listMembers(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT
        cs.member_id AS id,
        u.full_name AS name,
        u.email,
        u.phone,
        m.plan_name AS plan,
        cs.score,
        cs.risk_band,
        cs.days_since_visit,
        cs.visits_last_7d,
        cs.visits_last_30d,
        cs.calculated_at
      FROM churn_scores cs
      JOIN members m ON m.id = cs.member_id
      JOIN users u ON u.id = m.user_id
      WHERE cs.gym_id = ?
      ORDER BY cs.score DESC, u.full_name ASC
      `,
      [gymId],
    );
  },

  async getSummary(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT risk_band, COUNT(*) AS total
      FROM churn_scores
      WHERE gym_id = ?
      GROUP BY risk_band
      ORDER BY total DESC
      `,
      [gymId],
    );
  },

  async listAbsenceReminders(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT
        ar.id,
        ar.reminder_date,
        ar.status,
        ar.email_status,
        ar.motivation,
        ar.created_at,
        u.full_name AS member_name,
        u.email,
        m.plan_name
      FROM absence_reminders ar
      JOIN members m ON m.id = ar.member_id
      JOIN users u ON u.id = m.user_id
      WHERE ar.gym_id = ?
      ORDER BY ar.reminder_date DESC, ar.created_at DESC
      LIMIT 100
      `,
      [gymId],
    );
  },

  async getMemberForReengage(memberId: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT
        m.id,
        m.gym_id,
        m.plan_name,
        u.full_name AS name,
        u.phone
      FROM members m
      JOIN users u ON u.id = m.user_id
      WHERE m.id = ?
        AND m.gym_id = ?
        AND m.status = 'active'
      LIMIT 1
      `,
      [memberId, gymId],
    );

    return rows[0] ?? null;
  },
};