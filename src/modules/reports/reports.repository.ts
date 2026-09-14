import type { RowDataPacket } from "mysql2";
import { query } from "../../config/db.js";

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export const reportsRepository = {
  async dashboard(gymId: string) {
    const [
      totalMembers,
      activeMembers,
      membersThisMonth,
      membersLastMonth,
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      attendanceToday,
      leads
    ] = await Promise.all([
      query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM members WHERE gym_id = ?", [gymId]),
      query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM members WHERE gym_id = ? AND status = 'active'", [gymId]),
      query<RowDataPacket[]>(
        "SELECT COUNT(*) AS total FROM members WHERE gym_id = ? AND join_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
        [gymId]
      ),
      query<RowDataPacket[]>(
        `
        SELECT COUNT(*) AS total
        FROM members
        WHERE gym_id = ?
          AND join_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
          AND join_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
        `,
        [gymId]
      ),
      query<RowDataPacket[]>("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE gym_id = ? AND status = 'paid'", [gymId]),
      query<RowDataPacket[]>(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE gym_id = ? AND status = 'paid' AND paid_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
        [gymId]
      ),
      query<RowDataPacket[]>(
        `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE gym_id = ?
          AND status = 'paid'
          AND paid_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
          AND paid_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
        `,
        [gymId]
      ),
      query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM attendance_sessions WHERE gym_id = ? AND attendance_date = CURDATE()", [gymId]),
      query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM leads WHERE gym_id = ?", [gymId])
    ]);

    const newMembersThisMonth = Number(membersThisMonth[0]?.total ?? 0);
    const newMembersLastMonth = Number(membersLastMonth[0]?.total ?? 0);
    const thisMonthRevenue = Number(revenueThisMonth[0]?.total ?? 0);
    const lastMonthRevenue = Number(revenueLastMonth[0]?.total ?? 0);

    return {
      members: Number(totalMembers[0]?.total ?? 0),
      totalMembers: Number(totalMembers[0]?.total ?? 0),
      activeMembers: Number(activeMembers[0]?.total ?? 0),
      newMembersThisMonth,
      newMembersLastMonth,
      memberGrowthPercent: percentChange(newMembersThisMonth, newMembersLastMonth),
      revenue: Number(totalRevenue[0]?.total ?? 0),
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
      revenueThisMonth: thisMonthRevenue,
      revenueLastMonth: lastMonthRevenue,
      revenueGrowthPercent: percentChange(thisMonthRevenue, lastMonthRevenue),
      todayAttendance: Number(attendanceToday[0]?.count ?? 0),
      leads: Number(leads[0]?.total ?? 0)
    };
  },

  async revenue(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT month_key, total
      FROM (
        SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month_key, SUM(amount) AS total
        FROM payments
        WHERE gym_id = ? AND status = 'paid'
        GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
        ORDER BY month_key DESC
        LIMIT 12
      ) monthly_revenue
      ORDER BY month_key ASC
      `,
      [gymId]
    );
  },

  async growth(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT month_key, total
      FROM (
        SELECT DATE_FORMAT(join_date, '%Y-%m') AS month_key, COUNT(*) AS total
        FROM members
        WHERE gym_id = ? AND join_date IS NOT NULL
        GROUP BY DATE_FORMAT(join_date, '%Y-%m')
        ORDER BY month_key DESC
        LIMIT 12
      ) monthly_members
      ORDER BY month_key ASC
      `,
      [gymId]
    );
  },

  async attendance(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT attendance_date, total
      FROM (
        SELECT attendance_date, COUNT(*) AS total
        FROM attendance_sessions
        WHERE gym_id = ?
        GROUP BY attendance_date
        ORDER BY attendance_date DESC
        LIMIT 30
      ) daily_attendance
      ORDER BY attendance_date ASC
      `,
      [gymId]
    );
  },

  async churn(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT risk_band, COUNT(*) AS total
      FROM churn_scores
      WHERE gym_id = ?
      GROUP BY risk_band
      ORDER BY total DESC
      `,
      [gymId]
    );
  }
};
