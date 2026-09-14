import type { NextFunction, Request, Response } from "express";
import { aiService } from "./ai.service.js";

export const aiController = {
  async journeyInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await aiService.journeyInsights(req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async workoutGenerator(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await aiService.workoutGenerator(req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async marketingCopy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await aiService.marketingCopy(req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};