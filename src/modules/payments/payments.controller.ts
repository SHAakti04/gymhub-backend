import type { NextFunction, Request, Response } from "express";
import { paymentsService } from "./payments.service.js";

const param = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const paymentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.listPayments(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.createPayment({
        ...req.body,
        gymId: req.user!.gymId!,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listRenewals(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.listRenewals(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listPendingRenewals(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.listPendingRenewals(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createSelfRenewal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.createSelfRenewal({
        ...req.body,
        memberId: req.user?.memberId,
        gymId: req.user?.gymId,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async approveRenewal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.approveRenewal({
        id: param(req.params.id),
        gymId: req.user!.gymId!,
        adminUserId: req.user!.userId,
        confirmedAmount: req.body.confirmedAmount,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async rejectRenewal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.rejectRenewal({
        id: param(req.params.id),
        gymId: req.user!.gymId!,
        adminUserId: req.user!.userId,
        reason: req.body.reason,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async followups(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.listPaymentFollowups(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateFollowup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.updatePaymentFollowup({
        paymentId: param(req.params.id),
        gymId: req.user!.gymId!,
        paused: req.body.paused,
        autoReminder: req.body.autoReminder,
        followUp: req.body.followUp,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async sendReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.sendReminder(param(req.params.id), req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async receipt(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentsService.getReceiptById(param(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};