import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { whatsappController } from "./whatsapp.controller.js";

const runCampaignSchema = z.object({
  gymName: z.string().optional()
});

const dispatchSchema = z.object({
  limit: z.number().min(1).max(50).optional()
});

export const whatsappRoutes = Router();

whatsappRoutes.get("/whatsapp/status", authMiddleware, requireRoles("super", "admin", "staff"), whatsappController.status);
whatsappRoutes.post("/whatsapp/instances/connect", authMiddleware, requireRoles("super", "admin"), whatsappController.connect);
whatsappRoutes.get("/whatsapp/logs", authMiddleware, requireRoles("super", "admin", "staff"), whatsappController.logs);
whatsappRoutes.get("/whatsapp/templates", authMiddleware, requireRoles("super", "admin", "staff"), whatsappController.templates);
whatsappRoutes.get("/whatsapp/campaigns/expiry/targets", authMiddleware, requireRoles("super", "admin", "staff"), whatsappController.expiryTargets);
whatsappRoutes.get("/whatsapp/campaigns/churn/targets", authMiddleware, requireRoles("super", "admin", "staff"), whatsappController.churnTargets);
whatsappRoutes.post("/whatsapp/campaigns/expiry/run", authMiddleware, requireRoles("super", "admin"), validateBody(runCampaignSchema), whatsappController.runExpiry);
whatsappRoutes.post("/whatsapp/campaigns/churn/run", authMiddleware, requireRoles("super", "admin"), validateBody(runCampaignSchema), whatsappController.runChurn);
whatsappRoutes.post("/whatsapp/dispatch", authMiddleware, requireRoles("super", "admin"), validateBody(dispatchSchema), whatsappController.dispatch);