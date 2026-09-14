import { reportsRepository } from "./reports.repository.js";

export const reportsService = {
  dashboard: reportsRepository.dashboard,
  revenue: reportsRepository.revenue,
  attendance: reportsRepository.attendance,
  growth: reportsRepository.growth,
  churn: reportsRepository.churn
};
