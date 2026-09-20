import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export const paymentsRepository = {
  async listPayments(gymId: string) {
    return query(
      `SELECT
         p.*,
         TO_CHAR(p.paid_at, 'YYYY-MM-DD') AS date,
         p.plan_name AS plan,
         u.full_name AS member_name,
         r.receipt_no
       FROM payments p
       JOIN members m ON m.id = p.member_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.gym_id = $1
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

      await connection.query(
        `INSERT INTO payments
         (id, member_id, gym_id, amount, method, plan_name, status, paid_at, txn_ref, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), $7, $8)`,
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

      await connection.query(
        `INSERT INTO receipts
         (id, payment_id, member_id, gym_id, receipt_no, issued_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [receiptId, paymentId, input.memberId, input.gymId, receiptNo],
      );

      await connection.query(
        `INSERT INTO cashflow_entries
         (id, gym_id, entry_type, category, amount, entry_date, notes)
         VALUES ($1, $2, 'income', 'membership', $3, CURRENT_DATE, $4)`,
        [makeId(), input.gymId, input.amount, input.notes ?? null],
      );

      return { paymentId, receiptId, receiptNo };
    });
  },

  async listRenewals(gymId: string) {
    return query(
      `SELECT r.*, u.full_name AS member_name, u.email, u.phone
       FROM renewals r
       JOIN members m ON m.id = r.member_id
       JOIN users u ON u.id = m.user_id
       WHERE r.gym_id = $1
       ORDER BY r.created_at DESC`,
      [gymId],
    );
  },

  async listPendingRenewals(gymId: string) {
    return query(
      `SELECT r.*, u.full_name AS member_name, u.email, u.phone
       FROM renewals r
       JOIN members m ON m.id = r.member_id
       JOIN users u ON u.id = m.user_id
       WHERE r.gym_id = $1
         AND r.status IN ('pending', 'payment_review_required')
       ORDER BY r.created_at ASC`,
      [gymId],
    );
  },

  async getMemberRenewalWindow(input: { memberId: string; gymId: string }) {
    const rows = await query(
      `
      SELECT
        id,
        expiry_date,
        (expiry_date::date - CURRENT_DATE) AS days_to_expiry,
        TO_CHAR(expiry_date::date - INTERVAL '5 days', 'YYYY-MM-DD') AS eligible_from
      FROM members
      WHERE id = $1 AND gym_id = $2
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
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
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

    const rows = await query(
      "SELECT * FROM renewals WHERE id = $1 LIMIT 1",
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
      const result = await connection.query(
        `SELECT * FROM renewals
         WHERE id = $1 AND gym_id = $2
           AND status IN ('pending', 'payment_review_required')
         LIMIT 1 FOR UPDATE`,
        [input.id, input.gymId],
      );

      const renewal = result.rows[0] as Record<string, unknown> | undefined;
      if (!renewal) {
        throw new Error("RENEWAL_NOT_FOUND");
      }

      const amount = input.confirmedAmount ?? Number(renewal.amount);
      const method = renewal.payment_method === "online" ? "upi" : "cash";
      const paymentId = makeId();
      const receiptId = makeId();
      const receiptNo = `MYGYM-${Date.now()}`;

      await connection.query(
        `INSERT INTO payments
         (id, member_id, gym_id, amount, method, plan_name, status,
          paid_at, txn_ref, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), $7, $8)`,
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

      await connection.query(
        `INSERT INTO receipts
         (id, payment_id, member_id, gym_id, receipt_no, issued_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [receiptId, paymentId, renewal.member_id, input.gymId, receiptNo],
      );

      await connection.query(
        `INSERT INTO cashflow_entries
         (id, gym_id, entry_type, category, amount, entry_date, notes)
         VALUES ($1, $2, 'income', 'membership_renewal', $3, CURRENT_DATE, $4)`,
        [makeId(), input.gymId, amount, renewal.payment_note],
      );

      await connection.query(
        `UPDATE members
         SET plan_name = $1,
             expiry_date = GREATEST(CURRENT_DATE, COALESCE(expiry_date, CURRENT_DATE)) + INTERVAL '1 month'
         WHERE id = $2 AND gym_id = $3`,
        [renewal.plan_name, renewal.member_id, input.gymId],
      );

      await connection.query(
        `UPDATE renewals
         SET status = 'approved',
             renewed_payment_id = $1,
             reviewed_by_user_id = $2,
             reviewed_at = NOW()
         WHERE id = $3`,
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
           reviewed_by_user_id = $1,
           reviewed_at = NOW(),
           reject_reason = $2
       WHERE id = $3 AND gym_id = $4
         AND status IN ('pending', 'payment_review_required')`,
      [input.adminUserId, input.reason ?? null, input.id, input.gymId],
    );
  },

  async listPaymentFollowups(gymId: string) {
    return query(
      `
      SELECT payment_id, paused, auto_reminder, last_reminder_at, follow_up
      FROM payment_followups
      WHERE gym_id = $1
      ORDER BY updated_at DESC
      `,
      [gymId],
    );
  },

  async getPaymentFollowup(paymentId: string, gymId: string) {
    const rows = await query(
      `
      SELECT *
      FROM payment_followups
      WHERE payment_id = $1 AND gym_id = $2
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
      await query(
        `
        UPDATE payment_followups
        SET paused = $1, auto_reminder = $2, last_reminder_at = $3, follow_up = $4, updated_at = NOW()
        WHERE payment_id = $5 AND gym_id = $6
        `,
        [
          input.paused,
          input.autoReminder,
          input.lastReminderAt,
          input.followUp,
          input.paymentId,
          input.gymId,
        ],
      );

      return this.getPaymentFollowup(input.paymentId, input.gymId);
    }

    await query(
      `
      INSERT INTO payment_followups
      (id, payment_id, gym_id, paused, auto_reminder, last_reminder_at, follow_up)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        makeId(),
        input.paymentId,
        input.gymId,
        input.paused,
        input.autoReminder,
        input.lastReminderAt,
        input.followUp,
      ],
    );

    return this.getPaymentFollowup(input.paymentId, input.gymId);
  },

  async getPaymentReminderTarget(paymentId: string, gymId: string) {
    const rows = await query(
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
      WHERE p.id = $1 AND p.gym_id = $2
      LIMIT 1
      `,
      [paymentId, gymId],
    );

    return rows[0] ?? null;
  },

  async getReceiptById(receiptId: string) {
    const rows = await query(
      `SELECT r.*, p.amount, p.method, p.plan_name, p.paid_at,
              u.full_name AS member_name, u.email, u.phone
       FROM receipts r
       JOIN payments p ON p.id = r.payment_id
       JOIN members m ON m.id = r.member_id
       JOIN users u ON u.id = m.user_id
       WHERE r.id = $1
       LIMIT 1`,
      [receiptId],
    );

    return rows[0];
  },
};