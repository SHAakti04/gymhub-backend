import { config } from "dotenv";
import { z } from "zod";

config();

const boolFromEnv = z
  .string()
  .optional()
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  FRONTEND_URL: z.string().url().default("http://localhost:8080"),
  APP_LOGIN_URL: z.string().url().default("http://localhost:8080/auth/login"),
  MEMBER_TEMP_PASSWORD_LENGTH: z.coerce.number().default(10),
  TIMEZONE: z.string().default("Asia/Kolkata"),
  ENABLE_JOBS: boolFromEnv.default(false),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: boolFromEnv.default(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default("MyGym by FrontSight Technology"),
  SMTP_REPLY_TO_EMAIL: z.string().email().optional(),
  SMTP_FORCE_IPV4: boolFromEnv.default(true),
  SMTP_RESOLVE_IPV4: boolFromEnv.default(true),
  SMTP_ALLOW_SELF_SIGNED: boolFromEnv.default(false),
  SMTP_CONNECTION_TIMEOUT_MS: z.coerce.number().default(15000),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("mygym"),

  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_PROVIDER: z.enum(["dry_run", "evolution"]).default("dry_run"),
  WHATSAPP_DRY_RUN: boolFromEnv.default(true),
  EVOLUTION_API_URL: z.string().url().default("http://localhost:8080"),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().default("mygym-main"),
  WHATSAPP_SEND_DELAY_MS: z.coerce.number().default(5000),
  WHATSAPP_DAILY_LIMIT: z.coerce.number().default(100),
  WHATSAPP_TEST_RECIPIENT: z.string().optional(),

  OVERPASS_API_URL: z.string().url().default("https://overpass-api.de/api/interpreter"),
  NOMINATIM_BASE_URL: z.string().url().default("https://nominatim.openstreetmap.org"),
  PUBLIC_IP_LOOKUP_URL: z.string().url().default("https://api.ipify.org?format=json"),
  PINCODE_LOOKUP_URL: z.string().url().default("https://api.postalpincode.in/pincode")
});

export const env = envSchema.parse(process.env);
export type AppEnv = typeof env;