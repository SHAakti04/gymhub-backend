import type { NextFunction, Request, Response } from "express";
import { whatsappService } from "./whatsapp.service.js";

export const whatsappController = {
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.status(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.connectInstance();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async logs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.logs(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async templates(_req: Request, res: Response) {
    res.json({ success: true, data: whatsappService.templates() });
  },

  async expiryTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.expiryTargets(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async churnTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.churnTargets(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async runExpiry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.runExpiryCampaign(
        req.user?.gymId ?? "nagpur",
        req.body.gymName ?? "MyGym"
      );
      res.status(202).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async runChurn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.runChurnCampaign(
        req.user?.gymId ?? "nagpur",
        req.body.gymName ?? "MyGym"
      );
      res.status(202).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async dispatch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.dispatchQueued(req.body.limit ?? 10);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};