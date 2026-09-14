import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
// import { requireRoles } from "../../common/middleware/role.middleware.js";
import { reportsController } from "./reports.controller.js";

export const reportsRoutes = Router();

reportsRoutes.get("/reports/dashboard", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("reports"), reportsController.dashboard);
reportsRoutes.get("/reports/revenue", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("reports"), reportsController.revenue);
reportsRoutes.get("/reports/attendance", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("reports"), reportsController.attendance);
reportsRoutes.get("/reports/growth", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("reports"), reportsController.growth);
reportsRoutes.get("/reports/churn", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("churn"), reportsController.churn);