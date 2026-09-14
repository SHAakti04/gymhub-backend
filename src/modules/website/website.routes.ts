import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { websiteController } from "./website.controller.js";

export const websiteRoutes = Router();

const brandingSchema = z.object({
  publicName: z.string().trim().optional().nullable(),
  tagline: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  heroImageUrl: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  mapEmbedUrl: z.string().trim().optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional(),
});

const sectionSchema = z.object({
  content: z.unknown(),
});

const gallerySchema = z.object({
  title: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().min(1),
  altText: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

const programSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  duration: z.string().trim().optional().nullable(),
  levelName: z.string().trim().optional().nullable(),
  iconKey: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

const pricingSchema = z.object({
  name: z.string().trim().min(1),
  price: z.coerce.number().min(0),
  duration: z.string().trim().optional(),
  features: z.array(z.string()).optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

const blogSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  excerpt: z.string().trim().optional().nullable(),
  body: z.string().trim().optional().nullable(),
  coverImageUrl: z.string().trim().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  publishedAt: z.string().trim().optional().nullable(),
});

const adminOnly = [authMiddleware, requireRoles("super", "admin", "staff")] as const;

websiteRoutes.get("/website/public/:gymId", websiteController.publicContent);
websiteRoutes.get("/website/public/:gymId/gallery", websiteController.publicContent);
websiteRoutes.get("/website/public/:gymId/programs", websiteController.publicContent);
websiteRoutes.get("/website/public/:gymId/pricing", websiteController.publicContent);
websiteRoutes.get("/website/public/:gymId/blog", websiteController.publicContent);

websiteRoutes.get("/website/admin", ...adminOnly, websiteController.adminContent);
websiteRoutes.put(
  "/website/admin/branding",
  ...adminOnly,
  validateBody(brandingSchema),
  websiteController.saveBranding,
);
websiteRoutes.put(
  "/website/admin/sections/:sectionKey",
  ...adminOnly,
  validateBody(sectionSchema),
  websiteController.saveSection,
);

websiteRoutes.post("/website/admin/gallery", ...adminOnly, validateBody(gallerySchema), websiteController.createGallery);
websiteRoutes.patch("/website/admin/gallery/:id", ...adminOnly, validateBody(gallerySchema), websiteController.updateGallery);
websiteRoutes.delete("/website/admin/gallery/:id", ...adminOnly, websiteController.deleteGallery);

websiteRoutes.post("/website/admin/programs", ...adminOnly, validateBody(programSchema), websiteController.createProgram);
websiteRoutes.patch("/website/admin/programs/:id", ...adminOnly, validateBody(programSchema), websiteController.updateProgram);
websiteRoutes.delete("/website/admin/programs/:id", ...adminOnly, websiteController.deleteProgram);

websiteRoutes.post("/website/admin/pricing", ...adminOnly, validateBody(pricingSchema), websiteController.createPricing);
websiteRoutes.patch("/website/admin/pricing/:id", ...adminOnly, validateBody(pricingSchema), websiteController.updatePricing);
websiteRoutes.delete("/website/admin/pricing/:id", ...adminOnly, websiteController.deletePricing);

websiteRoutes.post("/website/admin/blog", ...adminOnly, validateBody(blogSchema), websiteController.createBlog);
websiteRoutes.patch("/website/admin/blog/:id", ...adminOnly, validateBody(blogSchema), websiteController.updateBlog);
websiteRoutes.delete("/website/admin/blog/:id", ...adminOnly, websiteController.deleteBlog);