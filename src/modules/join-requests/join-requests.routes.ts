import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { joinRequestsController } from "./join-requests.controller.js";

const createSchema = z.object({
  gymId: z.string().trim().min(1).default("nagpur"),
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10),
  planId: z.string().trim().min(1),
  planName: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["offline", "online"]),
  goals: z.string().trim().optional(),
  upiTxnRef: z.string().trim().max(120).optional(),
  paymentNote: z.string().trim().max(1000).optional()
});

const approveSchema = z.object({
  cashAmount: z.number().positive()
});

const rejectSchema = z.object({
  reason: z.string().max(255).optional()
});

const verifyRazorpaySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

export const joinRequestsRoutes = Router();

joinRequestsRoutes.post("/join-requests", validateBody(createSchema), joinRequestsController.create);
joinRequestsRoutes.get("/join-requests/pending", authMiddleware, requireRoles("super", "admin", "staff"), joinRequestsController.pending);
joinRequestsRoutes.post("/join-requests/:id/approve-offline", authMiddleware, requireRoles("super", "admin"), validateBody(approveSchema), joinRequestsController.approveOffline);
joinRequestsRoutes.post("/join-requests/:id/reject", authMiddleware, requireRoles("super", "admin"), validateBody(rejectSchema), joinRequestsController.reject);
joinRequestsRoutes.post("/join-requests/:id/razorpay-order", joinRequestsController.createRazorpayOrder);
joinRequestsRoutes.post("/join-requests/:id/verify-razorpay", validateBody(verifyRazorpaySchema), joinRequestsController.verifyRazorpay);