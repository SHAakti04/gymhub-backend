import type { NextFunction, Request, Response } from "express";
import { productsService } from "./products.service.js";

const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

function isAdminRole(req: Request) {
  return (req.user?.roles ?? []).some((role) => ["super", "admin", "staff"].includes(role));
}

export const productsController = {
  async publicList(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.list(param(req.params.gymId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async publicGet(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.get(param(req.params.id), param(req.params.gymId));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.list(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.create(req.user!.gymId!, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.update(param(req.params.id), req.user!.gymId!, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.remove(param(req.params.id), req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.checkout(req.user!.gymId!, req.user!.memberId!, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listGymOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.listOrdersForGym(req.user!.gymId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.listMyOrders(req.user!.gymId!, req.user!.memberId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.getOrder(req.user!.gymId!, req.user!.memberId ?? null, param(req.params.id), isAdminRole(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async fulfillOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.fulfillOrder(req.user!.gymId!, param(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsService.cancelOrder(req.user!.gymId!, req.user!.memberId ?? null, param(req.params.id), isAdminRole(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};