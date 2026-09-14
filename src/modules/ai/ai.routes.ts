import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { aiController } from "./ai.controller.js";

const journeySchema = z.object({
  stage: z.string().min(1),
  memberContext: z.string().min(1)
});

const workoutSchema = z.object({
  goal: z.string().min(1),
  level: z.string().min(1),
  notes: z.string().optional()
});

const marketingSchema = z.object({
  campaignType: z.string().min(1),
  audience: z.string().min(1),
  offer: z.string().min(1)
});

export const aiRoutes = Router();

aiRoutes.post("/ai/journey-insights", authMiddleware, requireRoles("super", "admin", "staff"), validateBody(journeySchema), aiController.journeyInsights);
aiRoutes.post("/ai/workout-generator", authMiddleware, requireRoles("super", "admin", "staff"), validateBody(workoutSchema), aiController.workoutGenerator);
aiRoutes.post("/ai/marketing-copy", authMiddleware, requireRoles("super", "admin", "staff"), validateBody(marketingSchema), aiController.marketingCopy);