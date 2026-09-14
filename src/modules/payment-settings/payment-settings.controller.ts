import type { NextFunction, Request, Response } from "express";
import { paymentSettingsService } from "./payment-settings.service.js";

export const paymentSettingsController = {
  async publicGet(req: Request, res: Response, next: NextFunction) {
    try {
const data = await paymentSettingsService.getPublic(String(req.params.gymId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async adminGet(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentSettingsService.getAdmin(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentSettingsService.save({
        ...req.body,
        gymId: req.user?.gymId ?? "nagpur"
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};