import type { NextFunction, Request, Response } from "express";
import { membersService } from "./members.service.js";

export const membersController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.createMember({
        ...req.body,
        gymId: req.user?.gymId ?? "nagpur"
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.listMembers({
        gymId: req.user?.gymId ?? null,
        isSuper: req.user?.roles.includes("super") ?? false,
        page: req.query.page as string | undefined,
        limit: req.query.limit as string | undefined
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
    async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.resetMemberPassword(String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
const data = await membersService.getMember(String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.updateMember(String(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async attendance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.getMemberAttendance(String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async payments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.getMemberPayments(String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async receipts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membersService.getMemberReceipts(String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};