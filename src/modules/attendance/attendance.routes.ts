import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { requireRoles } from "../../common/middleware/role.middleware.js";
import { requireFeature } from "../../common/middleware/feature.middleware.js";
import { validateBody } from "../../common/middleware/validate.middleware.js";
import { attendanceController } from "./attendance.controller.js";
import { checkInSchema, checkOutSchema, generateQrSchema, validateQrSchema } from "./attendance.validator.js";

export const attendanceRoutes = Router();

attendanceRoutes.get("/attendance/today", authMiddleware,requireFeature("attendance"), attendanceController.today);
attendanceRoutes.get("/attendance/daily-qr", authMiddleware, requireFeature("attendance"), attendanceController.dailyQr);

attendanceRoutes.post(
  "/attendance/daily-qr/generate",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  requireFeature("attendance"),
  validateBody(generateQrSchema),
  attendanceController.generate,
);

attendanceRoutes.post(
  "/attendance/daily-qr/validate",
  requireFeature("attendance"),
  validateBody(validateQrSchema),
  attendanceController.validate,
);

attendanceRoutes.post(
  "/attendance/check-in",
  authMiddleware,
  requireRoles("member"),
  requireFeature("attendance"),
  validateBody(checkInSchema),
  attendanceController.checkIn,
);

attendanceRoutes.post(
  "/attendance/check-out",
  authMiddleware,
  requireFeature("attendance"),
  validateBody(checkOutSchema),
  attendanceController.checkOut,
);

attendanceRoutes.get(
  "/attendance/absent-today",
  authMiddleware,
  requireFeature("attendance"),
  attendanceController.absentToday,
);

attendanceRoutes.get(
  "/attendance/absence-reminders",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  requireFeature("attendance"),
  attendanceController.absenceReminders,
);

attendanceRoutes.post(
  "/attendance/absence-reminders/queue",
  authMiddleware,
  requireRoles("super", "admin", "staff"),
  requireFeature("attendance"),
  attendanceController.queueAbsenceReminders,
);