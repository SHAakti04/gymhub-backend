import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { cashflowController } from "./cashflow.controller.js";

export const cashflowRoutes = Router();

const cashflowSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

cashflowRoutes.get(
  "/cashflow",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  requireFeature("cashflow"),
  cashflowController.list,
);

cashflowRoutes.post(
  "/cashflow",
  authMiddleware,
  requireRoles("super", "admin"),
  requireFeature("cashflow"),
  validateBody(cashflowSchema),
  cashflowController.create,
);