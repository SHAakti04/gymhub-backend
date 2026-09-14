import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { verifyMailConnection } from "./config/mail.js";
import { errorMiddleware } from "./common/middleware/error.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { membersRoutes } from "./modules/members/members.routes.js";
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { paymentsRoutes } from "./modules/payments/payments.routes.js";
import { staffRoutes } from "./modules/staff/staff.routes.js";
import { rostersRoutes } from "./modules/rosters/rosters.routes.js";
import { payrollRoutes } from "./modules/payroll/payroll.routes.js";
import { cashflowRoutes } from "./modules/cashflow/cashflow.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { churnRoutes } from "./modules/churn/churn.routes.js";
import { competitionsRoutes } from "./modules/competitions/competitions.routes.js";
import { offersRoutes } from "./modules/offers/offers.routes.js";
import { workoutsRoutes } from "./modules/workouts/workouts.routes.js";
import { productsRoutes } from "./modules/products/products.routes.js";
import { leadsRoutes } from "./modules/leads/leads.routes.js";
// import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { uploadsRoutes } from "./modules/uploads/uploads.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.routes.js";
import { joinRequestsRoutes } from "./modules/join-requests/join-requests.routes.js";
import { platformRoutes } from "./modules/platform/platform.routes.js";
import { featuresRoutes } from "./modules/features/features.routes.js";
import { paymentSettingsRoutes } from "./modules/payment-settings/payment-settings.routes.js";
import { websiteRoutes } from "./modules/website/website.routes.js";
export const app = express();

app.use(helmet());
app.use(cors({ origin: [env.FRONTEND_URL], credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(
  pinoHttp({
    logger,
customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) =>
  err || res.statusCode >= 500 ? "error" : "info"
  })
);

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "mygym-backend", timestamp: new Date().toISOString() });
});

app.get(`${env.API_PREFIX}/health/mail`, async (_req, res) => {
  try {
    const data = await verifyMailConnection();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: {
        code: "SMTP_UNAVAILABLE",
        message: "SMTP connection failed",
        details:
          env.NODE_ENV === "development"
            ? {
                code: error?.code,
                command: error?.command,
                message: error?.message,
              }
            : null,
      },
    });
  }
});

app.use(env.API_PREFIX, authRoutes);
app.use(env.API_PREFIX, platformRoutes);
app.use(env.API_PREFIX, featuresRoutes);
app.use(env.API_PREFIX, membersRoutes);
app.use(env.API_PREFIX, attendanceRoutes);
app.use(env.API_PREFIX, paymentsRoutes);
app.use(env.API_PREFIX, staffRoutes);
app.use(env.API_PREFIX, rostersRoutes);
app.use(env.API_PREFIX, payrollRoutes);
app.use(env.API_PREFIX, cashflowRoutes);
app.use(env.API_PREFIX, paymentSettingsRoutes);
app.use(env.API_PREFIX, websiteRoutes);
app.use(env.API_PREFIX, joinRequestsRoutes);
app.use(env.API_PREFIX, leadsRoutes);
app.use(env.API_PREFIX, reportsRoutes);
app.use(env.API_PREFIX, churnRoutes);
app.use(env.API_PREFIX, competitionsRoutes);
app.use(env.API_PREFIX, offersRoutes);
app.use(env.API_PREFIX, workoutsRoutes);
app.use(env.API_PREFIX, productsRoutes);
app.use(env.API_PREFIX, uploadsRoutes);
app.use(env.API_PREFIX, aiRoutes);
app.use(env.API_PREFIX, whatsappRoutes);
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" }
  });
});

app.use(errorMiddleware);