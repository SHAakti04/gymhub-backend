import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { payrollController } from "./payroll.controller.js";

export const payrollRoutes = Router();

const payrollSchema = z.object({
  staffId: z.string().uuid(),
  amount: z.number().positive(),
  month: z.string().min(7),
  method: z.string().min(1),
  txnRef: z.string().optional(),
  notes: z.string().optional(),
});

payrollRoutes.get("/payroll", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("payroll"), payrollController.list);
payrollRoutes.post("/payroll", authMiddleware, requireRoles("super", "admin"), requireFeature("payroll"), validateBody(payrollSchema), payrollController.create);