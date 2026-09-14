import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.email(),
  phone: z.string().min(10).max(30),
  password: z.string().min(6).max(100),
  gymId: z.string().min(1).max(64).optional(),
  role: z.enum(["admin", "member"]).optional()
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().trim().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1)
});