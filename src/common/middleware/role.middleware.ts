import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";

export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    const permitted = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!permitted) {
      return next(new AppError(403, "FORBIDDEN", "You do not have access to this resource"));
    }

    next();
  };
}