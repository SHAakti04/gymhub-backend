import type { Request, Response, NextFunction } from "express";
import { uploadsService } from "./uploads.service.js";

export const uploadsController = {
  async imageSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const data = uploadsService.imageSignature(req.body?.folder);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};