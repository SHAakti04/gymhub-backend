import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { offersController } from "./offers.controller.js";

export const offersRoutes = Router();

const offerSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  discountPct: z.number().min(1).max(100),
  validFrom: z.string().min(1),
  validTo: z.string().min(1),
  active: z.boolean().optional(),
  appliesTo: z.enum(["all", "new", "renewal"]),
});

const offerPatchSchema = offerSchema.partial();

offersRoutes.get(
  "/offers",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  offersController.list,
);

offersRoutes.get(
  "/offers/active",
  authMiddleware,
  requireRoles("member"),
  offersController.listActive,
);

offersRoutes.post(
  "/offers",
  authMiddleware,
  requireRoles("super", "admin"),
  validateBody(offerSchema),
  offersController.create,
);

offersRoutes.patch(
  "/offers/:id",
  authMiddleware,
  requireRoles("super", "admin"),
  validateBody(offerPatchSchema),
  offersController.update,
);

offersRoutes.delete(
  "/offers/:id",
  authMiddleware,
  requireRoles("super", "admin"),
  offersController.remove,
);