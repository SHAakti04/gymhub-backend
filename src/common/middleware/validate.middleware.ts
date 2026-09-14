import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../errors/app-error.js";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten()));
    }
    req.body = parsed.data;
    next();
  };
}