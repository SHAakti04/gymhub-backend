import bcrypt from "bcryptjs";
import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import { getPagination } from "../../common/utils/pagination.util.js";

export const membersRepository = {
  async listMembers(input: { gymId: string | null; isSuper: boolean; page?: number | string; limit?: number | string }) {
    const { page, limit, offset } = getPagination(input);
    const params: unknown[] = [];
    let whereSql = "";
    let paramIdx = 1;

    if (!input.isSuper && input.gymId) {
      whereSql = `WHERE m.gym_id = $${paramIdx++}`;
      params.push(input.gymId);
    }

    const rows = await query(
      `
      SELECT m.id, m.gym_id, m.plan_name, m.status, m.join_date, m.expiry_date,
        m.age, m.gender, m.emergency_contact, m.avatar_url,
        u.full_name, u.email, u.phone, u.must_change_password
      FROM members m
      JOIN users u ON u.id = m.user_id
      ${whereSql}
      ORDER BY m.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      [...params, limit, offset]
    );

    const countRows = await query(`SELECT COUNT(*) AS total FROM members m ${whereSql}`, params);
    return { items: rows, meta: { page, limit, total: Number((countRows[0] as Record<string, unknown>)?.total ?? 0) } };
  },

  async createMember(input: {
    gymId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    planName: string;
    amount?: number;
    method?: "cash" | "upi" | "card";
    expiryDate?: string;
    notes?: string;
  }) {
    return withTransaction(async (connection) => {
      const existingResult = await connection.query(
        "SELECT id FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1",
        [input.email.trim().toLowerCase()]
      );
      if (existingResult.rows[0]) {
        const error = new Error("An account with this email already exists") as Error & { statusCode?: number; code?: string };
        error.statusCode = 409;
        error.code = "EMAIL_ALREADY_EXISTS";
        throw error;
      }

      const roleResult = await connection.query("SELECT id FROM roles WHERE name = 'member' LIMIT 1");
      const roleId = roleResult.rows[0]?.id as string | undefined;
      if (!roleId) throw new Error("Member role is not configured");

      const userId = makeId();
      const memberId = makeId();
      const passwordHash = await bcrypt.hash(input.password, 10);

      await connection.query(
        "INSERT INTO users (id, gym_id, email, password_hash, full_name, phone, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, TRUE)",
        [userId, input.gymId, input.email, passwordHash, input.fullName, input.phone]
      );

      await connection.query("INSERT INTO user_role_assignments (id, user_id, role_id) VALUES ($1, $2, $3)", [
        makeId(),
        userId,
        roleId
      ]);

      await connection.query(
        "INSERT INTO members (id, user_id, gym_id, plan_name, status, join_date, expiry_date) VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, $5)",
        [memberId, userId, input.gymId, input.planName, input.expiryDate ?? null]
      );

      let paymentId: string | null = null;
      if (input.amount && input.amount > 0) {
        paymentId = makeId();
        const receiptId = makeId();
        const receiptNo = `RCP-${new Date().getFullYear()}-${Date.now()}`;

        await connection.query(
          "INSERT INTO payments (id, member_id, gym_id, amount, method, plan_name, status, paid_at, notes) VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), $7)",
          [paymentId, memberId, input.gymId, input.amount, input.method ?? "cash", input.planName, input.notes ?? null]
        );

        await connection.query(
          "INSERT INTO receipts (id, payment_id, member_id, gym_id, receipt_no, issued_at, metadata_json) VALUES ($1, $2, $3, $4, $5, NOW(), $6)",
          [receiptId, paymentId, memberId, input.gymId, receiptNo, JSON.stringify({ source: "member_creation" })]
        );

        await connection.query(
          "INSERT INTO cashflow_entries (id, gym_id, entry_type, category, amount, entry_date, notes) VALUES ($1, $2, 'income', 'Membership', $3, CURRENT_DATE, $4)",
          [makeId(), input.gymId, input.amount, `Opening payment for ${input.fullName}`]
        );
      }

      return { userId, memberId, paymentId };
    });
  },

  async getMemberByEmail(input: { gymId: string; email: string }) {
    const rows = await query(
      `
      SELECT m.id, m.user_id, m.gym_id, m.plan_name, m.status, u.email, u.full_name, u.phone
      FROM members m
      JOIN users u ON u.id = m.user_id
      WHERE m.gym_id = $1 AND LOWER(TRIM(u.email)) = $2
      LIMIT 1
      `,
      [input.gymId, input.email.trim().toLowerCase()]
    );

    return rows[0] ?? null;
  },

  async updateMemberPassword(input: { memberId: string; passwordHash: string }) {
    const rows = await query(
      "SELECT user_id FROM members WHERE id = $1 LIMIT 1",
      [input.memberId]
    );

    const userId = (rows[0] as Record<string, unknown> | undefined)?.user_id as string | undefined;
    if (!userId) return null;

    await query(
      "UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2",
      [input.passwordHash, userId]
    );

    return userId;
  },

  async auditCredentials(input: { userId: string; memberId: string; gymId: string; email: string; actionName: string; status: string }) {
    await query(
      "INSERT INTO member_credentials_audit (id, user_id, member_id, gym_id, action_name, delivered_to_email, delivery_status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [makeId(), input.userId, input.memberId, input.gymId, input.actionName, input.email, input.status]
    );
  },

  async getMemberById(memberId: string) {
    const rows = await query(
      `
      SELECT m.id, m.gym_id, m.plan_name, m.status, m.join_date, m.expiry_date,
        m.age, m.gender, m.emergency_contact, m.avatar_url,
        u.full_name, u.email, u.phone
      FROM members m
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1
      LIMIT 1
      `,
      [memberId]
    );
    return rows[0] ?? null;
  },

  async updateMember(memberId: string, input: Partial<{ fullName: string; phone: string; status: string; planName: string; expiryDate: string }>) {
    const current = await this.getMemberById(memberId);
    if (!current) return null;

    if (input.fullName || input.phone) {
      const userIdRows = await query("SELECT user_id FROM members WHERE id = $1 LIMIT 1", [memberId]);
      await query("UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone) WHERE id = $3", [
        input.fullName ?? null,
        input.phone ?? null,
        (userIdRows[0] as Record<string, unknown>)?.user_id
      ]);
    }

    await query(
      "UPDATE members SET status = COALESCE($1, status), plan_name = COALESCE($2, plan_name), expiry_date = COALESCE($3, expiry_date) WHERE id = $4",
      [input.status ?? null, input.planName ?? null, input.expiryDate ?? null, memberId]
    );

    return this.getMemberById(memberId);
  },

  async getMemberAttendance(memberId: string) {
    return query("SELECT * FROM attendance_sessions WHERE member_id = $1 ORDER BY attendance_date DESC, created_at DESC", [memberId]);
  },

  async getMemberPayments(memberId: string) {
    return query(
      `
      SELECT
        p.*,
        r.id AS receipt_id,
        r.receipt_no
      FROM payments p
      LEFT JOIN receipts r ON r.payment_id = p.id
      WHERE p.member_id = $1
      ORDER BY p.paid_at DESC
      `,
      [memberId],
    );
  },

  async getMemberReceipts(memberId: string) {
    return query("SELECT * FROM receipts WHERE member_id = $1 ORDER BY issued_at DESC", [memberId]);
  }
};