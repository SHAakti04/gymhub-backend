import { AppError } from "../../common/errors/app-error.js";
import { whatsappRepository } from "../whatsapp/whatsapp.repository.js";
import { offersService } from "../offers/offers.service.js";
import { offersRepository } from "../offers/offers.repository.js";
import { paymentsRepository } from "./payments.repository.js";
export const paymentsService = {
  listPayments(gymId: string) {
    return paymentsRepository.listPayments(gymId);
  },

  createPayment(input: {
    memberId: string;
    gymId: string;
    amount: number;
    method: string;
    planName: string;
    txnRef?: string;
    notes?: string;
  }) {
    return paymentsRepository.createPayment(input);
  },

  listRenewals(gymId: string) {
    return paymentsRepository.listRenewals(gymId);
  },

  listPendingRenewals(gymId: string) {
    return paymentsRepository.listPendingRenewals(gymId);
  },

  async createSelfRenewal(input: {
    memberId?: string | null;
    gymId?: string | null;
    planName: string;
    amount: number;
    paymentMethod: "offline" | "online";
    upiTxnRef?: string;
    paymentNote?: string;
    offerCode?: string;
  }) {
    if (!input.memberId || !input.gymId) {
      throw new AppError(403, "FORBIDDEN", "Only registered members can submit renewals");
    }

    const member = await paymentsRepository.getMemberRenewalWindow({
      memberId: input.memberId,
      gymId: input.gymId,
    });

    if (!member) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member profile not found");
    }

    if (!member.expiry_date) {
      throw new AppError(400, "RENEWAL_NOT_AVAILABLE", "Your plan expiry date is not set. Please contact gym admin.");
    }

    const daysToExpiry = Number(member.days_to_expiry);

    if (daysToExpiry > 5) {
      throw new AppError(
        400,
        "RENEWAL_NOT_AVAILABLE",
        `You can renew this plan from ${member.eligible_from}, 5 days before your expiry date.`,
      );
    }

    if (input.paymentMethod === "online" && !input.upiTxnRef?.trim()) {
      throw new AppError(400, "VALIDATION_ERROR", "UPI transaction reference is required");
    }

    let offerResult: Awaited<ReturnType<typeof offersService.validateAndPrice>> | null = null;

    if (input.offerCode?.trim()) {
      offerResult = await offersService.validateAndPrice(input.gymId, input.offerCode, input.amount, "renewal");
    }

    const renewal = await paymentsRepository.createRenewalRequest({
      memberId: input.memberId,
      gymId: input.gymId,
      planName: input.planName,
      amount: offerResult ? offerResult.finalAmount : input.amount,
      paymentMethod: input.paymentMethod,
      upiTxnRef: input.upiTxnRef?.trim(),
      paymentNote: input.paymentNote?.trim(),
      offerCode: offerResult?.code,
      offerDiscountPct: offerResult?.discountPct,
      originalAmount: offerResult ? input.amount : undefined,
    });

    if (offerResult) {
      await offersRepository.recordRedemption({
        offerId: offerResult.offerId,
        gymId: input.gymId,
        memberId: input.memberId,
        contextType: "renewal",
        contextId: renewal.id,
        discountPct: offerResult.discountPct,
        discountAmount: offerResult.discountAmount,
      });
    }

    return renewal;
  },

  async approveRenewal(input: {
    id: string;
    gymId: string;
    adminUserId: string;
    confirmedAmount?: number;
  }) {
    try {
      return await paymentsRepository.approveRenewal(input);
    } catch (error) {
      if (error instanceof Error && error.message === "RENEWAL_NOT_FOUND") {
        throw new AppError(404, "NOT_FOUND", "Pending renewal request not found");
      }
      throw error;
    }
  },

  rejectRenewal(input: {
    id: string;
    gymId: string;
    adminUserId: string;
    reason?: string;
  }) {
    return paymentsRepository.rejectRenewal(input);
  },

  listPaymentFollowups(gymId: string) {
    return paymentsRepository.listPaymentFollowups(gymId);
  },

  async updatePaymentFollowup(input: {
    paymentId: string;
    gymId: string;
    paused?: boolean;
    autoReminder?: boolean;
    followUp?: string;
  }) {
    const existing = await paymentsRepository.getPaymentFollowup(input.paymentId, input.gymId);

    return paymentsRepository.savePaymentFollowup({
      paymentId: input.paymentId,
      gymId: input.gymId,
      paused: input.paused ?? Boolean(existing?.paused ?? 0),
      autoReminder: input.autoReminder ?? Boolean(existing?.auto_reminder ?? 0),
      lastReminderAt: existing?.last_reminder_at ?? null,
      followUp: input.followUp ?? String(existing?.follow_up ?? "none"),
    });
  },

  async sendReminder(paymentId: string, gymId: string) {
    const target = await paymentsRepository.getPaymentReminderTarget(paymentId, gymId);

    if (!target) {
      throw new AppError(404, "NOT_FOUND", "Payment not found");
    }

    if (!target.phone) {
      throw new AppError(400, "VALIDATION_ERROR", "Member phone number is missing");
    }

    await whatsappRepository.queueBroadcast({
      gymId,
      phone: target.phone,
      campaign: "payment-followup",
      message: `Hi ${target.member_name}, your MyGym payment for ${target.plan_name ?? "your plan"} of Rs ${Number(target.amount)} needs follow-up. Please contact the gym to complete it.`,
    });

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    await paymentsRepository.savePaymentFollowup({
      paymentId,
      gymId,
      paused: false,
      autoReminder: true,
      lastReminderAt: now,
      followUp: "whatsapp",
    });

    return { queued: true };
  },

  async getReceiptById(id: string) {
    const receipt = await paymentsRepository.getReceiptById(id);

    if (!receipt) {
      throw new AppError(404, "NOT_FOUND", "Receipt not found");
    }

    return receipt;
  },
};