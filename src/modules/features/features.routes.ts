import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { featuresController } from "./features.controller.js";

export const featuresRoutes = Router();

featuresRoutes.get("/features/me", authMiddleware, featuresController.mine);