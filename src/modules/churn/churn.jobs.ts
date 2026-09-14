import { churnService } from "./churn.service.js";

export async function refreshChurnScoresForAllGyms() {
  return churnService.refreshAllGyms();
}