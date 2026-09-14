import type { NextFunction, Request, Response } from "express";
import { platformService } from "./platform.service.js";

export const platformController = {
  async dashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.dashboard();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listGyms(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listGyms();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateGym(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.updateGym(
        req.user?.userId ?? null,
        String(req.params.gymId),
        req.body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listPlans();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.createPlan(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.updatePlan(String(req.params.planId), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listFeatures(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listFeatures();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createFeature(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.createFeature(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listGymFeatures(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listGymFeatures(String(req.params.gymId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async setGymFeature(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.setGymFeature({
        actorUserId: req.user?.userId ?? null,
        gymId: String(req.params.gymId),
        featureKey: String(req.params.featureKey),
        enabled: Boolean(req.body.enabled),
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async onboardGym(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.onboardGym(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async suspendGym(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.setGymStatus(
        String(req.params.gymId),
        "suspended",
        req.user?.userId ?? null,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async reinstateGym(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.setGymStatus(
        String(req.params.gymId),
        "active",
        req.user?.userId ?? null,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.getSubscription(String(req.params.gymId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async assignPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.assignPlan(
        req.user?.userId ?? null,
        String(req.params.gymId),
        req.body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.updateSubscription(
        req.user?.userId ?? null,
        String(req.params.gymId),
        req.body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listInvoices(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listInvoices();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listPayments(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listPayments();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listUsers();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.updateUserRoles(
        req.user?.userId ?? null,
        String(req.params.userId),
        req.body.roles,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async enterAsAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.enterAsAdmin(
        req.user?.userId ?? null,
        String(req.params.gymId),
        req.body.reason,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async impersonate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.enterAsAdmin(
        req.user?.userId ?? null,
        req.body.gymId,
        req.body.reason,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async endImpersonation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.endImpersonation(
        req.user?.userId ?? null,
        req.body.sessionId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listAudit(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listAudit();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listSupportIssues(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listSupportIssues();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createSupportIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.createSupportIssue(req.user?.userId ?? null, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};