import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export const paymentsRepository = {
  async listPayments(gymId: string) {
    return query<RowDataPacket[]>(
      `SELECT
         p.*,
         DATE_FORMAT(p.paid_at, '%Y-%m-%d') AS date,
         p.plan_name AS plan,
         u.full_name AS member_name,
         r.receipt_no
       FROM payments p
       JOIN members m ON m.id = p.member_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.gym_id = ?
       ORDER BY p.paid_at DESC`,
      [gymId],
    );
  },

  async createPayment(input: {
    memberId: string;
    gymId: string;
    amount: number;
    method: string;
    planName: string;
    txnRef?: string;
    notes?: string;
  }) {
    return withTransaction(async (connection) => {
      const paymentId = makeId();
      const receiptId = makeId();
      const receiptNo = `MYGYM-${Date.now()}`;

      await connection.execute(
        `INSERT INTO payments
         (id, member_id, gym_id, amount, method, plan_name, status, paid_at, txn_ref, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'paid', NOW(), ?, ?)`,
        [
          paymentId,
          input.memberId,
          input.gymId,
          input.amount,
          input.method,
          input.planName,
          input.txnRef ?? null,
          input.notes ?? null,
        ],
      );

      await connection.execute(
        `INSERT INTO receipts
         (id, payment_id, member_id, gym_id, receipt_no, issued_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [receiptId, paymentId, input.memberId, input.gymId, receiptNo],
      );

      await connection.execute(
        `INSERT INTO cashflow_entries
         (id, gym_id, entry_type, category, amount, entry_date, notes)
         VALUES (?, ?, 'income', 'membership', ?, CURDATE(), ?)`,
        [makeId(), input.gymId, input.amount, input.notes ?? null],
      );

      return { paymentId, receiptId, receiptNo };
    });
  },

  async listRenewals(gymId: string) {
    return query<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS member_name, u.email, u.phone
       FROM renewals r
       JOIN members m ON m.id = r.member_id
       JOIN users u ON u.id = m.user_id
       WHERE r.gym_id = ?
       ORDER BY r.created_at DESC`,
      [gymId],
    );
  },

  async listPendingRenewals(gymId: string) {
    return query<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS member_name, u.email, u.phone
       FROM renewals r
       JOIN members m ON m.id = r.member_id
       JOIN users u ON u.id = m.user_id
       WHERE r.gym_id = ?
         AND r.status IN ('pending', 'payment_review_required')
       ORDER BY r.created_at ASC`,
      [gymId],
    );
  },
  async getMemberRenewalWindow(input: { memberId: string; gymId: string }) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT
        id,
        expiry_date,
        DATEDIFF(expiry_date, CURDATE()) AS days_to_expiry,
        DATE_FORMAT(DATE_SUB(expiry_date, INTERVAL 5 DAY), '%Y-%m-%d') AS eligible_from
      FROM members
      WHERE id = ? AND gym_id = ?
      LIMIT 1
      `,
      [input.memberId, input.gymId],
    );

    return rows[0] ?? null;
  },
  async createRenewalRequest(input: {
    memberId: string;
    gymId: string;
    planName: string;
    amount: number;
    paymentMethod: "offline" | "online";
    upiTxnRef?: string;
    paymentNote?: string;
    offerCode?: string;
    offerDiscountPct?: number;
    originalAmount?: number;
  }) {
    const id = makeId();
    const status = input.paymentMethod === "online" ? "payment_review_required" : "pending";

    await query(
      `INSERT INTO renewals
       (id, member_id, gym_id, due_date, status, plan_name, amount,
        payment_method, upi_txn_ref, payment_note, offer_code, offer_discount_pct, original_amount, submitted_at)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        input.memberId,
        input.gymId,
        status,
        input.planName,
        input.amount,
        input.paymentMethod,
        input.upiTxnRef ?? null,
        input.paymentNote ?? null,
        input.offerCode ?? null,
        input.offerDiscountPct ?? null,
        input.originalAmount ?? null,
      ],
    );

    const rows = await query<RowDataPacket[]>(
      "SELECT * FROM renewals WHERE id = ? LIMIT 1",
      [id],
    );

    return rows[0];
  },

  async approveRenewal(input: {
    id: string;
    gymId: string;
    adminUserId: string;
    confirmedAmount?: number;
  }) {
    return withTransaction(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM renewals
         WHERE id = ? AND gym_id = ?
           AND status IN ('pending', 'payment_review_required')
         LIMIT 1 FOR UPDATE`,
        [input.id, input.gymId],
      );

      const renewal = rows[0];
      if (!renewal) {
        throw new Error("RENEWAL_NOT_FOUND");
      }

      const amount = input.confirmedAmount ?? Number(renewal.amount);
      const method = renewal.payment_method === "online" ? "upi" : "cash";
      const paymentId = makeId();
      const receiptId = makeId();
      const receiptNo = `MYGYM-${Date.now()}`;

      await connection.execute(
        `INSERT INTO payments
         (id, member_id, gym_id, amount, method, plan_name, status,
          paid_at, txn_ref, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'paid', NOW(), ?, ?)`,
        [
          paymentId,
          renewal.member_id,
          input.gymId,
          amount,
          method,
          renewal.plan_name,
          renewal.upi_txn_ref,
          renewal.payment_note,
        ],
      );

      await connection.execute(
        `INSERT INTO receipts
         (id, payment_id, member_id, gym_id, receipt_no, issued_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [receiptId, paymentId, renewal.member_id, input.gymId, receiptNo],
      );

      await connection.execute(
        `INSERT INTO cashflow_entries
         (id, gym_id, entry_type, category, amount, entry_date, notes)
         VALUES (?, ?, 'income', 'membership_renewal', ?, CURDATE(), ?)`,
        [makeId(), input.gymId, amount, renewal.payment_note],
      );

      await connection.execute(
        `UPDATE members
         SET plan_name = ?,
             expiry_date = DATE_ADD(
               GREATEST(CURDATE(), COALESCE(expiry_date, CURDATE())),
               INTERVAL 1 MONTH
             )
         WHERE id = ? AND gym_id = ?`,
        [renewal.plan_name, renewal.member_id, input.gymId],
      );

      await connection.execute(
        `UPDATE renewals
         SET status = 'approved',
             renewed_payment_id = ?,
             reviewed_by_user_id = ?,
             reviewed_at = NOW()
         WHERE id = ?`,
        [paymentId, input.adminUserId, input.id],
      );

      return { paymentId, receiptId, receiptNo };
    });
  },

  async rejectRenewal(input: {
    id: string;
    gymId: string;
    adminUserId: string;
    reason?: string;
  }) {
    return query(
      `UPDATE renewals
       SET status = 'rejected',
           reviewed_by_user_id = ?,
           reviewed_at = NOW(),
           reject_reason = ?
       WHERE id = ? AND gym_id = ?
         AND status IN ('pending', 'payment_review_required')`,
      [input.adminUserId, input.reason ?? null, input.id, input.gymId],
    );
  },

  async listPaymentFollowups(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT payment_id, paused, auto_reminder, last_reminder_at, follow_up
      FROM payment_followups
      WHERE gym_id = ?
      ORDER BY updated_at DESC
      `,
      [gymId],
    );
  },

  async getPaymentFollowup(paymentId: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT *
      FROM payment_followups
      WHERE payment_id = ? AND gym_id = ?
      LIMIT 1
      `,
      [paymentId, gymId],
    );

    return rows[0] ?? null;
  },

  async savePaymentFollowup(input: {
    paymentId: string;
    gymId: string;
    paused: boolean;
    autoReminder: boolean;
    lastReminderAt: string | null;
    followUp: string;
  }) {
    const existing = await this.getPaymentFollowup(input.paymentId, input.gymId);

    if (existing) {
      await query<ResultSetHeader>(
        `
        UPDATE payment_followups
        SET paused = ?, auto_reminder = ?, last_reminder_at = ?, follow_up = ?, updated_at = NOW()
        WHERE payment_id = ? AND gym_id = ?
        `,
        [
          input.paused ? 1 : 0,
          input.autoReminder ? 1 : 0,
          input.lastReminderAt,
          input.followUp,
          input.paymentId,
          input.gymId,
        ],
      );

      return this.getPaymentFollowup(input.paymentId, input.gymId);
    }

    await query<ResultSetHeader>(
      `
      INSERT INTO payment_followups
      (id, payment_id, gym_id, paused, auto_reminder, last_reminder_at, follow_up)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        makeId(),
        input.paymentId,
        input.gymId,
        input.paused ? 1 : 0,
        input.autoReminder ? 1 : 0,
        input.lastReminderAt,
        input.followUp,
      ],
    );

    return this.getPaymentFollowup(input.paymentId, input.gymId);
  },

  async getPaymentReminderTarget(paymentId: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT
        p.id,
        p.amount,
        p.plan_name,
        u.full_name AS member_name,
        u.phone
      FROM payments p
      JOIN members m ON m.id = p.member_id
      JOIN users u ON u.id = m.user_id
      WHERE p.id = ? AND p.gym_id = ?
      LIMIT 1
      `,
      [paymentId, gymId],
    );

    return rows[0] ?? null;
  },

  async getReceiptById(receiptId: string) {
    const rows = await query<RowDataPacket[]>(
      `SELECT r.*, p.amount, p.method, p.plan_name, p.paid_at,
              u.full_name AS member_name, u.email, u.phone
       FROM receipts r
       JOIN payments p ON p.id = r.payment_id
       JOIN members m ON m.id = r.member_id
       JOIN users u ON u.id = m.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [receiptId],
    );

    return rows[0];
  },
};