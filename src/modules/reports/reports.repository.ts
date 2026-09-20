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
      query("SELECT COUNT(*) AS total FROM members WHERE gym_id = $1", [gymId]),
      query("SELECT COUNT(*) AS total FROM members WHERE gym_id = $1 AND status = 'active'", [gymId]),
      query(
        "SELECT COUNT(*) AS total FROM members WHERE gym_id = $1 AND join_date >= DATE_TRUNC('month', CURRENT_DATE)::date",
        [gymId]
      ),
      query(
        `
        SELECT COUNT(*) AS total
        FROM members
        WHERE gym_id = $1
          AND join_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date
          AND join_date < DATE_TRUNC('month', CURRENT_DATE)::date
        `,
        [gymId]
      ),
      query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE gym_id = $1 AND status = 'paid'", [gymId]),
      query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE gym_id = $1 AND status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)",
        [gymId]
      ),
      query(
        `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE gym_id = $1
          AND status = 'paid'
          AND paid_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          AND paid_at < DATE_TRUNC('month', CURRENT_DATE)
        `,
        [gymId]
      ),
      query("SELECT COUNT(*) AS count FROM attendance_sessions WHERE gym_id = $1 AND attendance_date = CURRENT_DATE", [gymId]),
      query("SELECT COUNT(*) AS total FROM leads WHERE gym_id = $1", [gymId])
    ]);

    const r = (arr: unknown[]) => arr[0] as Record<string, unknown> | undefined;

    const newMembersThisMonth = Number(r(membersThisMonth)?.total ?? 0);
    const newMembersLastMonth = Number(r(membersLastMonth)?.total ?? 0);
    const thisMonthRevenue = Number(r(revenueThisMonth)?.total ?? 0);
    const lastMonthRevenue = Number(r(revenueLastMonth)?.total ?? 0);

    return {
      members: Number(r(totalMembers)?.total ?? 0),
      totalMembers: Number(r(totalMembers)?.total ?? 0),
      activeMembers: Number(r(activeMembers)?.total ?? 0),
      newMembersThisMonth,
      newMembersLastMonth,
      memberGrowthPercent: percentChange(newMembersThisMonth, newMembersLastMonth),
      revenue: Number(r(totalRevenue)?.total ?? 0),
      totalRevenue: Number(r(totalRevenue)?.total ?? 0),
      revenueThisMonth: thisMonthRevenue,
      revenueLastMonth: lastMonthRevenue,
      revenueGrowthPercent: percentChange(thisMonthRevenue, lastMonthRevenue),
      todayAttendance: Number(r(attendanceToday)?.count ?? 0),
      leads: Number(r(leads)?.total ?? 0)
    };
  },

  async revenue(gymId: string) {
    return query(
      `
      SELECT month_key, total
      FROM (
        SELECT TO_CHAR(paid_at, 'YYYY-MM') AS month_key, SUM(amount) AS total
        FROM payments
        WHERE gym_id = $1 AND status = 'paid'
        GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
        ORDER BY month_key DESC
        LIMIT 12
      ) monthly_revenue
      ORDER BY month_key ASC
      `,
      [gymId]
    );
  },

  async growth(gymId: string) {
    return query(
      `
      SELECT month_key, total
      FROM (
        SELECT TO_CHAR(join_date, 'YYYY-MM') AS month_key, COUNT(*) AS total
        FROM members
        WHERE gym_id = $1 AND join_date IS NOT NULL
        GROUP BY TO_CHAR(join_date, 'YYYY-MM')
        ORDER BY month_key DESC
        LIMIT 12
      ) monthly_members
      ORDER BY month_key ASC
      `,
      [gymId]
    );
  },

  async attendance(gymId: string) {
    return query(
      `
      SELECT attendance_date, total
      FROM (
        SELECT attendance_date, COUNT(*) AS total
        FROM attendance_sessions
        WHERE gym_id = $1
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
    return query(
      `
      SELECT risk_band, COUNT(*) AS total
      FROM churn_scores
      WHERE gym_id = $1
      GROUP BY risk_band
      ORDER BY total DESC
      `,
      [gymId]
    );
  }
};