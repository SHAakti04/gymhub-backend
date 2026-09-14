import type { NextFunction, Request, Response } from "express";
import { churnService } from "./churn.service.js";

const param = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const churnController = {
  async members(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await churnService.members(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await churnService.summary(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async absenceReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await churnService.absenceReminders(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async reengage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await churnService.reengageMember(req.user!.gymId!, param(req.params.memberId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};