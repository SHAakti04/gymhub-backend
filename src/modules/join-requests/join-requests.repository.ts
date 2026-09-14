import type { RowDataPacket } from "mysql2";
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
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    const rows = await query<RowDataPacket[]>("SELECT * FROM member_join_requests WHERE id = ? LIMIT 1", [id]);
    return rows[0];
  },

async pending(gymId: string) {
  return query<RowDataPacket[]>(
    `
    SELECT *
    FROM member_join_requests
    WHERE gym_id = ?
      AND status IN ('pending', 'payment_review_required')
    ORDER BY created_at DESC
    `,
    [gymId]
  );
},

  async getById(id: string) {
    const rows = await query<RowDataPacket[]>("SELECT * FROM member_join_requests WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  },

async getPendingById(id: string, gymId: string) {
  const rows = await query<RowDataPacket[]>(
    `
    SELECT *
    FROM member_join_requests
    WHERE id = ?
      AND gym_id = ?
      AND status IN ('pending', 'payment_review_required')
    LIMIT 1
    `,
    [id, gymId]
  );
  return rows[0] ?? null;
},

  async getOnlineAwaitingPaymentById(id: string) {
    const rows = await query<RowDataPacket[]>(
      "SELECT * FROM member_join_requests WHERE id = ? AND payment_method = 'online' AND status = 'awaiting_payment' LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  },

  async attachRazorpayOrder(input: { id: string; orderId: string }) {
    await query("UPDATE member_join_requests SET razorpay_order_id = ? WHERE id = ?", [input.orderId, input.id]);
  },

  async markApproved(input: { id: string; memberId: string; adminUserId: string | null; emailSent: boolean }) {
    await query(
      `
      UPDATE member_join_requests
      SET status = 'approved',
        approved_by_user_id = ?,
        approved_at = NOW(),
        activated_member_id = ?,
        credential_email_sent_at = ${input.emailSent ? "NOW()" : "NULL"}
      WHERE id = ?
      `,
      [input.adminUserId, input.memberId, input.id]
    );
  },

  async markRejected(input: { id: string; adminUserId: string | null; reason: string | null }) {
    await query(
      `
      UPDATE member_join_requests
      SET status = 'rejected',
        rejected_by_user_id = ?,
        rejected_at = NOW(),
        reject_reason = ?
      WHERE id = ?
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
        activated_member_id = ?,
        razorpay_payment_id = ?,
        razorpay_signature = ?,
        credential_email_sent_at = ${input.emailSent ? "NOW()" : "NULL"}
      WHERE id = ?
      `,
      [input.memberId, input.paymentId, input.signature, input.id]
    );
  }
};