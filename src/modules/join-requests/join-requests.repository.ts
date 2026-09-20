import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export const joinRequestsRepository = {
  async create(input: {
    gymId: string;
    name: string;
    email: string;
    phone: string;
    planId: string;
    planName: string;
    amount: number;
    paymentMethod: "offline" | "online";
    goals?: string;
    upiTxnRef?: string;
    paymentNote?: string;
  }) {
    const id = makeId();

    await query(
      `
      INSERT INTO member_join_requests
        (id, gym_id, name, email, phone, plan_id, plan_name, amount, payment_method, status, goals, upi_txn_ref, payment_note, payment_submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        id,
        input.gymId,
        input.name,
        input.email,
        input.phone,
        input.planId,
        input.planName,
        input.amount,
        input.paymentMethod,
        input.paymentMethod === "offline" ? "pending" : input.upiTxnRef ? "payment_review_required" : "awaiting_payment",
        input.goals ?? null,
        input.upiTxnRef ?? null,
        input.paymentNote ?? null,
        input.upiTxnRef ? new Date() : null
      ]
    );

    const rows = await query("SELECT * FROM member_join_requests WHERE id = $1 LIMIT 1", [id]);
    return rows[0];
  },

  async pending(gymId: string) {
    return query(
      `
      SELECT *
      FROM member_join_requests
      WHERE gym_id = $1
        AND status IN ('pending', 'payment_review_required')
      ORDER BY created_at DESC
      `,
      [gymId]
    );
  },

  async getById(id: string) {
    const rows = await query("SELECT * FROM member_join_requests WHERE id = $1 LIMIT 1", [id]);
    return rows[0] ?? null;
  },

  async getPendingById(id: string, gymId: string) {
    const rows = await query(
      `
      SELECT *
      FROM member_join_requests
      WHERE id = $1
        AND gym_id = $2
        AND status IN ('pending', 'payment_review_required')
      LIMIT 1
      `,
      [id, gymId]
    );
    return rows[0] ?? null;
  },

  async getOnlineAwaitingPaymentById(id: string) {
    const rows = await query(
      "SELECT * FROM member_join_requests WHERE id = $1 AND payment_method = 'online' AND status = 'awaiting_payment' LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  },

  async attachRazorpayOrder(input: { id: string; orderId: string }) {
    await query("UPDATE member_join_requests SET razorpay_order_id = $1 WHERE id = $2", [input.orderId, input.id]);
  },

  async markApproved(input: { id: string; memberId: string; adminUserId: string | null; emailSent: boolean }) {
    await query(
      `
      UPDATE member_join_requests
      SET status = 'approved',
        approved_by_user_id = $1,
        approved_at = NOW(),
        activated_member_id = $2,
        credential_email_sent_at = ${input.emailSent ? "NOW()" : "NULL"}
      WHERE id = $3
      `,
      [input.adminUserId, input.memberId, input.id]
    );
  },

  async markRejected(input: { id: string; adminUserId: string | null; reason: string | null }) {
    await query(
      `
      UPDATE member_join_requests
      SET status = 'rejected',
        rejected_by_user_id = $1,
        rejected_at = NOW(),
        reject_reason = $2
      WHERE id = $3
      `,
      [input.adminUserId, input.reason, input.id]
    );
  },

  async markRazorpayPaid(input: {
    id: string;
    memberId: string;
    paymentId: string;
    signature: string;
    emailSent: boolean;
  }) {
    await query(
      `
      UPDATE member_join_requests
      SET status = 'approved',
        approved_at = NOW(),
        activated_member_id = $1,
        razorpay_payment_id = $2,
        razorpay_signature = $3,
        credential_email_sent_at = ${input.emailSent ? "NOW()" : "NULL"}
      WHERE id = $4
      `,
      [input.memberId, input.paymentId, input.signature, input.id]
    );
  }
};