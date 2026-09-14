import type { NextFunction, Request, Response } from "express";
import { leadsService } from "./leads.service.js";

export const leadsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await leadsService.createLead({
        ...req.body,
        consentIp: req.ip,
        consentUserAgent: req.headers["user-agent"] ?? null
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await leadsService.listLeads(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
const data = await leadsService.updateLeadStatus(String(req.params.id), req.body.status);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async optOut(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await leadsService.optOut(req.body.id, req.body.phone);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async analytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await leadsService.analytics(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await leadsService.createBroadcast({
        ...req.body,
        gymId: req.user?.gymId ?? "nagpur"
      });
      res.status(202).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async searchNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await leadsService.searchNearbyBusinesses({
        gymId: req.user?.gymId ?? "nagpur",
        lat: req.body.lat,
        lng: req.body.lng,
        radiusMeters: req.body.radiusMeters
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};