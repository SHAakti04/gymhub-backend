import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { paymentSettingsController } from "./payment-settings.controller.js";

const saveSchema = z.object({
  upiId: z.string().max(120).optional(),
  payeeName: z.string().max(150).optional(),
  qrImageUrl: z.string().url().optional().or(z.literal("")),
  instructions: z.string().max(1000).optional(),
  isActive: z.boolean().optional()
});

export const paymentSettingsRoutes = Router();

paymentSettingsRoutes.get("/payment-settings/public/:gymId", paymentSettingsController.publicGet);
paymentSettingsRoutes.get("/payment-settings", authMiddleware, requireRoles("super", "admin"), paymentSettingsController.adminGet);
paymentSettingsRoutes.put("/payment-settings", authMiddleware, requireRoles("super", "admin"), validateBody(saveSchema), paymentSettingsController.save);