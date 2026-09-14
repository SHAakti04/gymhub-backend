import type { NextFunction, Request, Response } from "express";
import { reportsService } from "./reports.service.js";

export const reportsController = {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.dashboard(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async revenue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.revenue(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async attendance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.attendance(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async growth(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.growth(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async churn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.churn(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};