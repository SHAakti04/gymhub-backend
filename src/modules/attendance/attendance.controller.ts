import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { attendanceService } from "./attendance.service.js";
export const attendanceController = {
  async today(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.getToday(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async dailyQr(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.getDailyQr(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.generateDailyQr(req.body.gymId, req.user?.userId ?? null);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.validateDailyQr(req.body.gymId, req.body.code);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.user?.memberId;
      const gymId = req.user?.gymId;

      if (!memberId || !gymId) {
        throw new AppError(403, "MEMBER_CONTEXT_REQUIRED", "Only linked member accounts can scan attendance QR");
      }

      const data = await attendanceService.checkIn({
        memberId,
        gymId,
        qrCode: req.body.qrCode,
        source: "camera",
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.checkOut(req.body.memberId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async absentToday(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.absentToday(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async queueAbsenceReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.queueAbsenceReminders(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async absenceReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.listAbsenceReminders(req.user?.gymId ?? "nagpur");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};