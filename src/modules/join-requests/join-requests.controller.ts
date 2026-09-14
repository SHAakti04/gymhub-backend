import type { NextFunction, Request, Response } from "express";
import { joinRequestsService } from "./join-requests.service.js";

export const joinRequestsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await joinRequestsService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async pending(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await joinRequestsService.pending(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async approveOffline(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await joinRequestsService.approveOffline({
        id: String(req.params.id),
        gymId: req.user?.gymId ?? "nagpur",
        adminUserId: req.user?.userId ?? null,
        cashAmount: req.body.cashAmount
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await joinRequestsService.reject({
        id: String(req.params.id),
        gymId: req.user?.gymId ?? "nagpur",
        adminUserId: req.user?.userId ?? null,
        reason: req.body.reason
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createRazorpayOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await joinRequestsService.createRazorpayOrder(String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async verifyRazorpay(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await joinRequestsService.verifyRazorpay({
        id: String(req.params.id),
        razorpayOrderId: req.body.razorpayOrderId,
        razorpayPaymentId: req.body.razorpayPaymentId,
        razorpaySignature: req.body.razorpaySignature
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};