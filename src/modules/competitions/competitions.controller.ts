import type { NextFunction, Request, Response } from "express";
import { competitionsService } from "./competitions.service.js";

const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

export const competitionsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.list(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.listActive(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async leaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.getLeaderboard(param(req.params.id), req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.create(req.user!.gymId!, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.update(param(req.params.id), req.user!.gymId!, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.remove(param(req.params.id), req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await competitionsService.join(param(req.params.id), req.user!.gymId!, req.user!.memberId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateScore(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId, score } = req.body as { memberId: string; score: number };
      const data = await competitionsService.updateScore(param(req.params.id), req.user!.gymId!, memberId, score);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};