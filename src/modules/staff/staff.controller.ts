import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { staffService } from "./staff.service.js";

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value ?? "");

const gymIdFrom = (req: Request) => {
  const gymId = req.user?.gymId;
  if (!gymId) {
    throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
  }
  return gymId;
};

export const staffController = {
  async publicTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const gymId = typeof req.query.gymId === "string" ? req.query.gymId : "nagpur";
      const data = await staffService.publicTrainers(gymId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await staffService.list(gymIdFrom(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await staffService.create(gymIdFrom(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await staffService.update(param(req.params.id), gymIdFrom(req), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};