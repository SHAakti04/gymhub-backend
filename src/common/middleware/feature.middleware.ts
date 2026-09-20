import type { NextFunction, Request, Response } from "express";
import { query } from "../../config/db.js";
import { AppError } from "../errors/app-error.js";

function isSuper(req: Request) {
  return Boolean(req.user?.roles?.includes("super"));
}

export async function getEnabledFeaturesForGym(gymId: string) {
  const rows = await query(
    `
    SELECT
      fr.feature_key,
      fr.name,
      COALESCE(gff.enabled, FALSE) AS enabled
    FROM feature_registry fr
    LEFT JOIN gym_feature_flags gff
      ON gff.feature_key = fr.feature_key
      AND gff.gym_id = $1
    ORDER BY fr.name ASC
    `,
    [gymId],
  );

  return rows.map((row) => ({
    featureKey: String(row.feature_key),
    name: String(row.name),
    enabled: Boolean(row.enabled),
  }));
}

export async function assertGymFeatureEnabled(gymId: string, featureKey: string) {
  const gymRows = await query(
    `SELECT id, status, subscription_status FROM gyms WHERE id = $1 LIMIT 1`,
    [gymId],
  );

  const gym = gymRows[0];
  if (!gym) {
    throw new AppError(404, "GYM_NOT_FOUND", "Gym not found");
  }

  if (gym.status === "suspended" || gym.subscription_status === "suspended") {
    throw new AppError(403, "GYM_SUSPENDED", "This gym subscription is suspended");
  }

  const rows = await query(
    `
    SELECT COALESCE(gff.enabled, FALSE) AS enabled
    FROM feature_registry fr
    LEFT JOIN gym_feature_flags gff
      ON gff.feature_key = fr.feature_key
      AND gff.gym_id = $1
    WHERE fr.feature_key = $2
    LIMIT 1
    `,
    [gymId, featureKey],
  );

  const row = rows[0];

  if (!row || !Boolean(row.enabled)) {
    throw new AppError(
      403,
      "FEATURE_DISABLED",
      `The ${featureKey} module is not enabled for this gym`,
    );
  }
}

export function requireFeature(featureKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (isSuper(req)) {
        return next();
      }

      const gymId = req.user?.gymId;
      if (!gymId) {
        throw new AppError(400, "GYM_REQUIRED", "Gym context is required");
      }

      await assertGymFeatureEnabled(gymId, featureKey);
      next();
    } catch (error) {
      next(error);
    }
  };
}