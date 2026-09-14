import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";

export function errorMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details ?? null }
    });
  }

    const details =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: env.NODE_ENV === "development" ? error.stack : undefined,
        }
      : error;

  logger.error({ error: details, path: req.path }, "Unhandled backend error");

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
      details: env.NODE_ENV === "development" ? details : null,
    },
  });
}