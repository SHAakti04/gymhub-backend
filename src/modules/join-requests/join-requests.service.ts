import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { membersService } from "../members/members.service.js";
import { joinRequestsRepository } from "./join-requests.repository.js";

function requireRazorpayConfig() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(500, "RAZORPAY_NOT_CONFIGURED", "Razorpay keys are not configured");
  }
}

function verifySignature(orderId: string, paymentId: string, signature: string) {
  if (!env.RAZORPAY_KEY_SECRET) return false;

  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function createRazorpayOrderRequest(input: { amount: number; receipt: string; notes: Record<string, string> }) {
  requireRazorpayConfig();

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes
    })
  });

  const raw = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError(502, "RAZORPAY_ORDER_FAILED", "Could not create Razorpay order", raw);
  }

  return raw as { id: string; amount: number; currency: string };
}

export const joinRequestsService = {
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
    return joinRequestsRepository.create(input);
  },

  async pending(gymId: string) {
    return joinRequestsRepository.pending(gymId);
  },

  async approveOffline(input: { id: string; gymId: string; adminUserId: string | null; cashAmount: number }) {
    const request = await joinRequestsRepository.getPendingById(input.id, input.gymId);
    if (!request) throw new AppError(404, "JOIN_REQUEST_NOT_FOUND", "Pending join request not found");

    try {
      const created = await membersService.createMember({
        gymId: request.gym_id,
        fullName: request.name,
        email: request.email,
        phone: request.phone,
        planName: request.plan_name,
        amount: input.cashAmount,
        method: request.payment_method === "online" ? "upi" : "cash",
        notes: `${request.payment_method === "online" ? "QR payment" : "Offline join"} approved from request ${request.id}`
      });

      await joinRequestsRepository.markApproved({
        id: request.id,
        memberId: created.memberId,
        adminUserId: input.adminUserId,
        emailSent: created.credentialEmailStatus === "sent"
      });

      return {
        requestId: request.id,
        memberId: created.memberId,
        credentialEmailStatus: created.credentialEmailStatus
      };
    } catch (error: any) {
      if (error?.code !== "EMAIL_ALREADY_EXISTS") {
        throw error;
      }

      const existingMember = await membersService.findMemberByEmail({
        gymId: request.gym_id,
        email: request.email
      });

      if (!existingMember) {
        throw error;
      }

      await joinRequestsRepository.markApproved({
        id: request.id,
        memberId: existingMember.id,
        adminUserId: input.adminUserId,
        emailSent: false
      });

      return {
        requestId: request.id,
        memberId: existingMember.id,
        credentialEmailStatus: "existing_account"
      };
    }
  },

  async reject(input: { id: string; gymId: string; adminUserId: string | null; reason?: string }) {
    const request = await joinRequestsRepository.getPendingById(input.id, input.gymId);
    if (!request) throw new AppError(404, "JOIN_REQUEST_NOT_FOUND", "Pending join request not found");

    await joinRequestsRepository.markRejected({
      id: input.id,
      adminUserId: input.adminUserId,
      reason: input.reason ?? null
    });

    return { id: input.id, status: "rejected" };
  },

  async createRazorpayOrder(id: string) {
    const request = await joinRequestsRepository.getOnlineAwaitingPaymentById(id);
    if (!request) throw new AppError(404, "JOIN_REQUEST_NOT_FOUND", "Online join request not found");

    const order = await createRazorpayOrderRequest({
      amount: Number(request.amount),
      receipt: `join_${request.id}`,
      notes: {
        joinRequestId: request.id,
        gymId: request.gym_id,
        email: request.email
      }
    });

    await joinRequestsRepository.attachRazorpayOrder({ id: request.id, orderId: order.id });

    return {
      joinRequestId: request.id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID
    };
  },

  async verifyRazorpay(input: {
    id: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const request = await joinRequestsRepository.getById(input.id);
    if (!request) throw new AppError(404, "JOIN_REQUEST_NOT_FOUND", "Join request not found");

    if (request.status === "approved" && request.activated_member_id) {
      return {
        requestId: request.id,
        memberId: request.activated_member_id,
        credentialEmailStatus: request.credential_email_sent_at ? "sent" : "skipped"
      };
    }

    if (request.razorpay_order_id !== input.razorpayOrderId) {
      throw new AppError(400, "RAZORPAY_ORDER_MISMATCH", "Razorpay order does not match this join request");
    }

    const valid = verifySignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
    if (!valid) {
      throw new AppError(400, "RAZORPAY_SIGNATURE_INVALID", "Payment verification failed");
    }

    const created = await membersService.createMember({
      gymId: request.gym_id,
      fullName: request.name,
      email: request.email,
      phone: request.phone,
      planName: request.plan_name,
      amount: Number(request.amount),
      method: "upi",
      notes: `Razorpay payment ${input.razorpayPaymentId} for request ${request.id}`,
      
    });

    await joinRequestsRepository.markRazorpayPaid({
      id: request.id,
      memberId: created.memberId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      emailSent: created.credentialEmailStatus === "sent"
    });

    return { requestId: request.id, memberId: created.memberId, credentialEmailStatus: created.credentialEmailStatus };
  }
};
