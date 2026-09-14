import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { productsController } from "./products.controller.js";

export const productsRoutes = Router();

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  stockQty: z.number().int().min(0),
  category: z.string().optional(),
  discountPrice: z.number().positive().optional(),
  brand: z.string().optional(),
  images: z.array(z.string().min(1)).min(1),
});

const productPatchSchema = productSchema.partial();

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  paymentMethod: z.enum(["offline", "online"]),
  upiTxnRef: z.string().optional(),
  paymentNote: z.string().optional(),
});

productsRoutes.get("/products/public/:gymId", productsController.publicList);
productsRoutes.get("/products/public/:gymId/:id", productsController.publicGet);

productsRoutes.get("/products", authMiddleware, productsController.list);

productsRoutes.post(
  "/products",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  validateBody(productSchema),
  productsController.create,
);

productsRoutes.patch(
  "/products/:id",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  validateBody(productPatchSchema),
  productsController.update,
);

productsRoutes.delete(
  "/products/:id",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  productsController.remove,
);

productsRoutes.post(
  "/products/checkout",
  authMiddleware,
  requireRoles("member"),
  validateBody(checkoutSchema),
  productsController.checkout,
);

productsRoutes.get(
  "/orders",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  productsController.listGymOrders,
);

productsRoutes.get(
  "/orders/mine",
  authMiddleware,
  requireRoles("member"),
  productsController.listMyOrders,
);

productsRoutes.get(
  "/orders/:id",
  authMiddleware,
  requireRoles("super", "admin", "staff", "member"),
  productsController.getOrder,
);

productsRoutes.patch(
  "/orders/:id/fulfill",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  productsController.fulfillOrder,
);

productsRoutes.patch(
  "/orders/:id/cancel",
  authMiddleware,
  requireRoles("super", "admin", "staff", "member"),
  productsController.cancelOrder,
);