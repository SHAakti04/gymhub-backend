import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { workoutsController } from "./workouts.controller.js";

export const workoutsRoutes = Router();

const exerciseSchema = z.object({
  exercise: z.string().min(1),
  sets: z.string().min(1),
  reps: z.string().min(1),
  rest: z.string().min(1),
});

const savePresetSchema = z.object({
  exercises: z.array(exerciseSchema).min(1),
});

const generateSchema = z.object({
  goal: z.enum(["muscle", "weight_loss", "strength"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
});

const toggleLogSchema = z.object({
  exerciseIndex: z.number().int().min(0),
  exerciseName: z.string().min(1),
  date: z.string().optional(),
  completed: z.boolean(),
});

workoutsRoutes.get(
  "/workouts/presets",
  authMiddleware,
  requireRoles("super", "admin", "staff", "member"),
  workoutsController.presets,
);

workoutsRoutes.put(
  "/workouts/presets/:planKey",
  authMiddleware,
  requireRoles("super", "admin"),
  validateBody(savePresetSchema),
  workoutsController.savePreset,
);

workoutsRoutes.post(
  "/workouts/presets/reset",
  authMiddleware,
  requireRoles("super", "admin"),
  workoutsController.resetPresets,
);

workoutsRoutes.post(
  "/workouts/presets/:planKey/log",
  authMiddleware,
  requireRoles("member"),
  validateBody(toggleLogSchema),
  workoutsController.presetLog,
);

workoutsRoutes.get(
  "/workouts/presets/:planKey/log",
  authMiddleware,
  requireRoles("member"),
  workoutsController.presetChecklist,
);

workoutsRoutes.post(
  "/workouts/generate",
  authMiddleware,
  requireRoles("member"),
  validateBody(generateSchema),
  workoutsController.generate,
);

workoutsRoutes.get(
  "/workouts/my-plans",
  authMiddleware,
  requireRoles("member"),
  workoutsController.myPlans,
);

workoutsRoutes.get(
  "/workouts/plans/:id",
  authMiddleware,
  requireRoles("super", "admin", "staff", "member"),
  workoutsController.getPlan,
);

workoutsRoutes.post(
  "/workouts/plans/:id/log",
  authMiddleware,
  requireRoles("member"),
  validateBody(toggleLogSchema),
  workoutsController.toggleLog,
);

workoutsRoutes.get(
  "/workouts/plans/:id/log",
  authMiddleware,
  requireRoles("member"),
  workoutsController.todayChecklist,
);

workoutsRoutes.get(
  "/workouts/adherence",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  workoutsController.adherence,
);

workoutsRoutes.get(
  "/workouts/adherence/me",
  authMiddleware,
  requireRoles("member"),
  workoutsController.myAdherence,
);