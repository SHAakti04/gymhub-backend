import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { staffController } from "./staff.controller.js";

export const staffRoutes = Router();

const staffSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
  roleName: z.string().trim().min(1),
  salary: z.coerce.number().min(0).optional(),
  status: z.string().trim().min(1).optional(),
  joinDate: z.string().trim().optional(),
  avatarUrl: z.string().trim().url().optional(),
  specialty: z.string().trim().optional(),
  publicBio: z.string().trim().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  certifications: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
});

const staffUpdateSchema = staffSchema.partial();

staffRoutes.get("/staff", authMiddleware, requireRoles("super", "admin", "staff"), requireFeature("staff"), staffController.list);
staffRoutes.get("/staff/public/trainers", staffController.publicTrainers);
staffRoutes.post("/staff", authMiddleware, requireRoles("super", "admin"), requireFeature("staff"), validateBody(staffSchema), staffController.create);
staffRoutes.patch("/staff/:id", authMiddleware, requireRoles("super", "admin"), requireFeature("staff"), validateBody(staffUpdateSchema), staffController.update);