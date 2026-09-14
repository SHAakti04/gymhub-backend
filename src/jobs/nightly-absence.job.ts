import { logger } from "../config/logger.js";
import { attendanceService } from "../modules/attendance/attendance.service.js";

export async function runNightlyAbsenceJob() {
  const result = await attendanceService.queueAbsenceRemindersForAllGyms();
  logger.info(result, "Nightly absence job executed");
}