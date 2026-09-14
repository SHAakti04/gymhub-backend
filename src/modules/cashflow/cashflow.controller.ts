import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { cashflowService } from "./cashflow.service.js";

const gymIdFrom = (req: Request) => {
  const gymId = req.user?.gymId;
  if (!gymId) {
    throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
  }
  return gymId;
};

export const cashflowController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cashflowService.list(gymIdFrom(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cashflowService.create(gymIdFrom(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};