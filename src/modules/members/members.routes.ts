import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { membersController } from "./members.controller.js";

export const membersRoutes = Router();
membersRoutes.post("/members", authMiddleware, requireRoles("super", "admin"), requireFeature("members"), membersController.create);
membersRoutes.get("/members", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("members"), membersController.list);
membersRoutes.post(
  "/members/:id/reset-password",
  authMiddleware,
  requireRoles("super", "admin"),
  requireFeature("members"),
  membersController.resetPassword,
);
membersRoutes.get("/members/:id/attendance", authMiddleware, requireFeature("attendance"), membersController.attendance);
membersRoutes.get("/members/:id/payments", authMiddleware, requireFeature("payments"), membersController.payments);
membersRoutes.get("/members/:id/receipts", authMiddleware, requireFeature("payments"), membersController.receipts);
membersRoutes.get("/members/:id", authMiddleware, requireFeature("members"), membersController.get);
membersRoutes.patch("/members/:id", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("members"), membersController.update);