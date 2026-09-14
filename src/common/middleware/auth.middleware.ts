import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../config/auth.js";
import { AppError } from "../errors/app-error.js";

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing authorization token"));
  }

  const payload = verifyAccessToken(token);
  req.user = {
    userId: payload.sub,
    email: payload.email,
    gymId: payload.gymId ?? null,
    memberId: payload.memberId ?? null,
    roles: payload.roles,
    primaryRole: payload.primaryRole
  };
  next();
}