import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { getEnabledFeaturesForGym } from "../../common/middleware/feature.middleware.js";

export const featuresController = {
  async mine(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.roles.includes("super")) {
        return res.json({
          success: true,
          data: {
            unrestricted: true,
            features: [],
          },
        });
      }

      const gymId = req.user?.gymId;
      if (!gymId) {
        throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
      }

      const features = await getEnabledFeaturesForGym(gymId);
      res.json({
        success: true,
        data: {
          unrestricted: false,
          gymId,
          features,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};