import { Router } from "express";
import { authController } from "./auth.controller.js";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.validator.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";

export const authRoutes = Router();

authRoutes.post("/auth/login", validateBody(loginSchema), authController.login);
authRoutes.post("/auth/register", validateBody(registerSchema), authController.register);
authRoutes.post("/auth/refresh", validateBody(refreshSchema), authController.refresh);
authRoutes.post("/auth/logout", validateBody(logoutSchema), authController.logout);
authRoutes.get("/auth/me", authMiddleware, authController.me);