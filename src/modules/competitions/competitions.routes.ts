import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { competitionsController } from "./competitions.controller.js";

export const competitionsRoutes = Router();

const competitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  prize: z.string().optional(),
});

const competitionPatchSchema = competitionSchema.partial().extend({
  active: z.boolean().optional(),
});

const scoreSchema = z.object({
  memberId: z.string().uuid(),
  score: z.number(),
});

competitionsRoutes.get(
  "/competitions",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  competitionsController.list,
);

competitionsRoutes.get(
  "/competitions/active",
  authMiddleware,
  requireRoles("member"),
  competitionsController.listActive,
);

competitionsRoutes.get(
  "/competitions/:id/leaderboard",
  authMiddleware,
  requireRoles("super", "admin", "staff", "member"),
  competitionsController.leaderboard,
);

competitionsRoutes.post(
  "/competitions",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  validateBody(competitionSchema),
  competitionsController.create,
);

competitionsRoutes.patch(
  "/competitions/:id",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  validateBody(competitionPatchSchema),
  competitionsController.update,
);

competitionsRoutes.delete(
  "/competitions/:id",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  competitionsController.remove,
);

competitionsRoutes.post(
  "/competitions/:id/join",
  authMiddleware,
  requireRoles("member"),
  competitionsController.join,
);

competitionsRoutes.patch(
  "/competitions/:id/score",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  validateBody(scoreSchema),
  competitionsController.updateScore,
);