import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { websiteService } from "./website.service.js";

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value ?? "");

const gymIdFromAuth = (req: Request) => {
  const gymId = req.user?.gymId;
  if (!gymId) {
    throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
  }
  return gymId;
};

export const websiteController = {
  async publicContent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.publicContent(param(req.params.gymId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async adminContent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.adminContent(gymIdFromAuth(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async saveBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.saveBranding(gymIdFromAuth(req), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async saveSection(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.saveSection(
        gymIdFromAuth(req),
        param(req.params.sectionKey),
        req.body.content ?? {},
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.createGallery(gymIdFromAuth(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.updateGallery(gymIdFromAuth(req), param(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async deleteGallery(req: Request, res: Response, next: NextFunction) {
    try {
      await websiteService.deleteGallery(gymIdFromAuth(req), param(req.params.id));
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },

  async createProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.createProgram(gymIdFromAuth(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.updateProgram(gymIdFromAuth(req), param(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async deleteProgram(req: Request, res: Response, next: NextFunction) {
    try {
      await websiteService.deleteProgram(gymIdFromAuth(req), param(req.params.id));
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },

  async createPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.createPricing(gymIdFromAuth(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updatePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.updatePricing(gymIdFromAuth(req), param(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async deletePricing(req: Request, res: Response, next: NextFunction) {
    try {
      await websiteService.deletePricing(gymIdFromAuth(req), param(req.params.id));
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },

  async createBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.createBlog(gymIdFromAuth(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.updateBlog(gymIdFromAuth(req), param(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async deleteBlog(req: Request, res: Response, next: NextFunction) {
    try {
      await websiteService.deleteBlog(gymIdFromAuth(req), param(req.params.id));
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
};