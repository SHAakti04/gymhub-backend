import { logger } from "../config/logger.js";
import { churnService } from "../modules/churn/churn.service.js";

export async function runChurnRefreshJob() {
  const result = await churnService.refreshAllGyms();
  logger.info(result, "Churn refresh job executed");
}