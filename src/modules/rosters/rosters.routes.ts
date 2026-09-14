import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { rostersController } from "./rosters.controller.js";

export const rostersRoutes = Router();

const rosterSchema = z.object({
  staffId: z.string().uuid(),
  rosterDate: z.string().min(1),
  shiftStart: z.string().min(1),
  shiftEnd: z.string().min(1),
  notes: z.string().optional(),
});

rostersRoutes.get("/staff/roster", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("roster"), rostersController.list);
rostersRoutes.post("/staff/roster", authMiddleware, requireRoles("super", "admin"), requireFeature("roster"), validateBody(rosterSchema), rostersController.create);
rostersRoutes.delete("/staff/roster/:id", authMiddleware, requireRoles("super", "admin"), requireFeature("roster"), rostersController.delete);