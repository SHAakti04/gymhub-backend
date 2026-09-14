import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { churnController } from "./churn.controller.js";

export const churnRoutes = Router();

churnRoutes.get(
  "/churn/members",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  churnController.members,
);

churnRoutes.get(
  "/churn/summary",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  churnController.summary,
);

churnRoutes.get(
  "/churn/absence-reminders",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  churnController.absenceReminders,
);

churnRoutes.post(
  "/churn/reengage/:memberId",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  churnController.reengage,
);