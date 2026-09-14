import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { uploadsController } from "./uploads.controller.js";

const uploadSignatureSchema = z.object({
  folder: z.string().optional()
});

export const uploadsRoutes = Router();

uploadsRoutes.post(
  "/uploads/image-signature",
  authMiddleware,
  requireRoles("super", "admin", "staff", "member"),
  validateBody(uploadSignatureSchema),
  uploadsController.imageSignature
);