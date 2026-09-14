import cron from "node-cron";
import { logger } from "../config/logger.js";
import { runExpiryReminderJob } from "./expiry-reminder.job.js";
import { runNightlyAbsenceJob } from "./nightly-absence.job.js";
import { runChurnRefreshJob } from "./churn-refresh.job.js";
import { runBroadcastDispatchJob } from "./broadcast-dispatch.job.js";

export function startScheduler() {
  cron.schedule("0 10 * * *", () => void runExpiryReminderJob());
  cron.schedule("36 22 * * *", () => void runNightlyAbsenceJob(), {
    timezone: "Asia/Kolkata",
  });
  cron.schedule("0 */6 * * *", () => void runChurnRefreshJob());
  cron.schedule("*/15 * * * *", () => void runBroadcastDispatchJob());
  logger.info("Scheduler started");
}