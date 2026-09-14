import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { payrollService } from "./payroll.service.js";

const gymIdFrom = (req: Request) => {
  const gymId = req.user?.gymId;
  if (!gymId) {
    throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
  }
  return gymId;
};

export const payrollController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await payrollService.list(gymIdFrom(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await payrollService.create(gymIdFrom(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};