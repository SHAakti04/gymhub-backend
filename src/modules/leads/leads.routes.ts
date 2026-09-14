import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { leadsController } from "./leads.controller.js";

const leadCreateSchema = z.object({
  gymId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.email().optional().or(z.literal("")),
  source: z.string().default("trial_form"),
  consentGiven: z.literal(true),
  lat: z.number().optional(),
  lng: z.number().optional(),
  distanceKm: z.number().optional(),
  refCode: z.string().optional(),
  notes: z.string().optional(),
  metaPayload: z.any().optional()
});

const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "trial_booked", "converted", "lost", "opted_out"])
});

const leadOptOutSchema = z.object({
  id: z.string().min(1),
  phone: z.string().min(10)
});

const broadcastSchema = z.object({
  leadId: z.string().optional(),
  phone: z.string().min(10),
  message: z.string().min(1),
  campaign: z.string().min(1),
  channel: z.enum(["whatsapp", "email"]).default("whatsapp")
});

const nearbySearchSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().min(100).max(10000).default(3000)
});

export const leadsRoutes = Router();

leadsRoutes.post("/leads", validateBody(leadCreateSchema), leadsController.create);
leadsRoutes.get("/leads", authMiddleware, requireRoles("super", "admin", "staff"), leadsController.list);
leadsRoutes.patch("/leads/:id", authMiddleware, requireRoles("super", "admin", "staff"), validateBody(leadUpdateSchema), leadsController.update);
leadsRoutes.post("/leads/opt-out", validateBody(leadOptOutSchema), leadsController.optOut);
leadsRoutes.get("/leads/analytics", authMiddleware, requireRoles("super", "admin", "staff"), leadsController.analytics);
leadsRoutes.post("/broadcasts", authMiddleware, requireRoles("super", "admin"), validateBody(broadcastSchema), leadsController.broadcast);
leadsRoutes.post("/partnerships/search-nearby", authMiddleware, requireRoles("super", "admin"), validateBody(nearbySearchSchema), leadsController.searchNearby);