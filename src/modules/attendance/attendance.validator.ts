import { z } from "zod";

export const checkInSchema = z.object({
  qrCode: z.string().min(1),
  source: z.enum(["camera"]).default("camera")
});

export const checkOutSchema = z.object({
  memberId: z.string().min(1)
});

export const generateQrSchema = z.object({
  gymId: z.string().min(1)
});

export const validateQrSchema = z.object({
  gymId: z.string().min(1),
  code: z.string().min(1)
});