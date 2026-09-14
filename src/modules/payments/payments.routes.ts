import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { paymentsController } from "./payments.controller.js";

export const paymentsRoutes = Router();

const paymentSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.string().min(1),
  planName: z.string().min(1),
  txnRef: z.string().optional(),
  notes: z.string().optional(),
});

const selfRenewalSchema = z.object({
  planName: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(["offline", "online"]),
  upiTxnRef: z.string().optional(),
  paymentNote: z.string().optional(),
  offerCode: z.string().optional(),
});

const followupSchema = z.object({
  paused: z.boolean().optional(),
  autoReminder: z.boolean().optional(),
  followUp: z.enum(["none", "call", "whatsapp", "manual"]).optional(),
});

paymentsRoutes.get("/payments", authMiddleware, requireFeature("payments"),paymentsController.list);

paymentsRoutes.post(
  "/payments",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  validateBody(paymentSchema),
  paymentsController.create,
);

paymentsRoutes.get(
  "/payments/followups",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  paymentsController.followups,
);

paymentsRoutes.patch(
  "/payments/:id/followup",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  validateBody(followupSchema),
  paymentsController.updateFollowup,
);

paymentsRoutes.post(
  "/payments/:id/reminder",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  paymentsController.sendReminder,
);

paymentsRoutes.get("/renewals", authMiddleware, paymentsController.listRenewals);

paymentsRoutes.get(
  "/renewals/pending",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  paymentsController.listPendingRenewals,
);

paymentsRoutes.post(
  "/renewals/self",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("member"),
  validateBody(selfRenewalSchema),
  paymentsController.createSelfRenewal,
);

paymentsRoutes.post(
  "/renewals/:id/approve",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  paymentsController.approveRenewal,
);

paymentsRoutes.post(
  "/renewals/:id/reject",
  authMiddleware,
  requireFeature("payments"),
  requireRoles("super", "admin", "staff"),
  paymentsController.rejectRenewal,
);

paymentsRoutes.get("/receipts/:id", authMiddleware, requireFeature("payments"), paymentsController.receipt);