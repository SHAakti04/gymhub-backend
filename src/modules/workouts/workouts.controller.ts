import type { NextFunction, Request, Response } from "express";
import { workoutsService } from "./workouts.service.js";

const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);
const todayDate = () => new Date().toISOString().slice(0, 10);
const weekAgoDate = () => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

export const workoutsController = {
  async presets(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workoutsService.getPresetPlans(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async savePreset(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workoutsService.savePreset(
        req.user!.gymId!,
        req.user!.userId,
        param(req.params.planKey),
        req.body.exercises,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async resetPresets(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workoutsService.resetPresets(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workoutsService.generateAndSavePlan(req.user!.gymId!, req.user!.memberId!, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async myPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workoutsService.getMyPlans(req.user!.gymId!, req.user!.memberId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workoutsService.getPlan(req.user!.gymId!, param(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async toggleLog(req: Request, res: Response, next: NextFunction) {
    try {
      const { exerciseIndex, exerciseName, date, completed } = req.body;
      const data = await workoutsService.toggleLog(
        req.user!.gymId!,
        req.user!.memberId!,
        param(req.params.id),
        exerciseIndex,
        exerciseName,
        date || todayDate(),
        completed,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async todayChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const date = (req.query.date as string) || todayDate();
      const data = await workoutsService.getTodayChecklist(req.user!.memberId!, param(req.params.id), date);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async presetLog(req: Request, res: Response, next: NextFunction) {
    try {
      const { exerciseIndex, exerciseName, date, completed } = req.body;
      const data = await workoutsService.togglePresetLog(
        req.user!.gymId!,
        req.user!.memberId!,
        param(req.params.planKey),
        exerciseIndex,
        exerciseName,
        date || todayDate(),
        completed,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async presetChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const date = (req.query.date as string) || todayDate();
      const data = await workoutsService.getPresetChecklist(
        req.user!.gymId!,
        req.user!.memberId!,
        param(req.params.planKey),
        date,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async adherence(req: Request, res: Response, next: NextFunction) {
    try {
      const from = (req.query.from as string) || weekAgoDate();
      const to = (req.query.to as string) || todayDate();
      const data = await workoutsService.getAdherenceReport(req.user!.gymId!, from, to);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async myAdherence(req: Request, res: Response, next: NextFunction) {
    try {
      const from = (req.query.from as string) || weekAgoDate();
      const to = (req.query.to as string) || todayDate();
      const data = await workoutsService.getMyAdherence(req.user!.gymId!, req.user!.memberId!, from, to);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};