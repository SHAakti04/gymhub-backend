import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { platformController } from "./platform.controller.js";

export const platformRoutes = Router();

const featureToggleSchema = z.object({
  enabled: z.boolean(),
});

const onboardGymSchema = z.object({
  name: z.string().min(2),
  gymId: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().optional(),
  planId: z.string().min(1),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  brandColor: z.string().optional(),
  accentColor: z.string().optional(),
});

const updateGymSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  ownerName: z.string().min(2).optional(),
  ownerEmail: z.string().email().optional(),
  brandColor: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

const planSchema = z.object({
  id: z.string().min(2).optional(),
  name: z.string().min(2),
  tier: z.string().min(2).optional(),
  monthlyInr: z.number().nonnegative().optional(),
  annualInr: z.number().nonnegative().optional(),
  maxMembers: z.number().int().nonnegative().optional(),
  maxStaff: z.number().int().nonnegative().optional(),
  whatsappMonthlyQuota: z.number().int().nonnegative().optional(),
  aiMonthlyQuota: z.number().int().nonnegative().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const updatePlanSchema = planSchema.partial();

const featureSchema = z.object({
  featureKey: z.string().min(2).optional(),
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  defaultEnabled: z.boolean().optional(),
});

const assignPlanSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  status: z.enum(["trial", "active", "past_due", "suspended", "cancelled"]).optional(),
});

const updateSubscriptionSchema = z.object({
  status: z.enum(["trial", "active", "past_due", "suspended", "cancelled"]).optional(),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  priceInr: z.number().nonnegative().optional(),
  trialEndsAt: z.string().nullable().optional(),
  currentPeriodEnd: z.string().nullable().optional(),
});

const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(["super", "admin", "staff", "member"])).min(1),
});

const impersonateSchema = z.object({
  gymId: z.string().min(1),
  reason: z.string().optional(),
});

const endImpersonationSchema = z.object({
  sessionId: z.string().min(1),
});

const supportIssueSchema = z.object({
  gymId: z.string().nullable().optional(),
  title: z.string().min(2),
  body: z.string().min(2),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

platformRoutes.use("/platform", authMiddleware, requireRoles("super"));

platformRoutes.get("/platform/dashboard", platformController.dashboard);

platformRoutes.get("/platform/gyms", platformController.listGyms);
platformRoutes.post("/platform/gyms", validateBody(onboardGymSchema), platformController.onboardGym);
platformRoutes.patch("/platform/gyms/:gymId", validateBody(updateGymSchema), platformController.updateGym);
platformRoutes.post("/platform/gyms/:gymId/suspend", platformController.suspendGym);
platformRoutes.post("/platform/gyms/:gymId/reinstate", platformController.reinstateGym);
platformRoutes.post("/platform/gyms/:gymId/enter-admin", platformController.enterAsAdmin);

platformRoutes.get("/platform/plans", platformController.listPlans);
platformRoutes.post("/platform/plans", validateBody(planSchema), platformController.createPlan);
platformRoutes.patch("/platform/plans/:planId", validateBody(updatePlanSchema), platformController.updatePlan);

platformRoutes.get("/platform/gyms/:gymId/subscription", platformController.getSubscription);
platformRoutes.post("/platform/gyms/:gymId/assign-plan", validateBody(assignPlanSchema), platformController.assignPlan);
platformRoutes.patch(
  "/platform/gyms/:gymId/subscription",
  validateBody(updateSubscriptionSchema),
  platformController.updateSubscription,
);

platformRoutes.get("/platform/features", platformController.listFeatures);
platformRoutes.post("/platform/features", validateBody(featureSchema), platformController.createFeature);
platformRoutes.get("/platform/gyms/:gymId/features", platformController.listGymFeatures);
platformRoutes.patch(
  "/platform/gyms/:gymId/features/:featureKey",
  validateBody(featureToggleSchema),
  platformController.setGymFeature,
);

platformRoutes.get("/platform/invoices", platformController.listInvoices);
platformRoutes.get("/platform/payments", platformController.listPayments);

platformRoutes.get("/platform/users", platformController.listUsers);
platformRoutes.patch(
  "/platform/users/:userId/roles",
  validateBody(updateUserRolesSchema),
  platformController.updateUserRoles,
);

platformRoutes.post("/platform/impersonate", validateBody(impersonateSchema), platformController.impersonate);
platformRoutes.post(
  "/platform/impersonate/end",
  validateBody(endImpersonationSchema),
  platformController.endImpersonation,
);

platformRoutes.get("/platform/audit", platformController.listAudit);

platformRoutes.get("/platform/support/issues", platformController.listSupportIssues);
platformRoutes.post(
  "/platform/support/issues",
  validateBody(supportIssueSchema),
  platformController.createSupportIssue,
);