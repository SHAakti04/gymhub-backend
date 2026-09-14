import type { NextFunction, Request, Response } from "express";
import { offersService } from "./offers.service.js";

const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

export const offersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await offersService.list(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await offersService.listActive(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await offersService.create(req.user!.gymId!, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await offersService.update(param(req.params.id), req.user!.gymId!, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await offersService.remove(param(req.params.id), req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};