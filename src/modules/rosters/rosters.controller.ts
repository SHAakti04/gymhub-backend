import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { rostersService } from "./rosters.service.js";

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value ?? "");

const gymIdFrom = (req: Request) => {
  const gymId = req.user?.gymId;
  if (!gymId) {
    throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
  }
  return gymId;
};

export const rostersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rostersService.list(gymIdFrom(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rostersService.create(gymIdFrom(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rostersService.delete(param(req.params.id), gymIdFrom(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};