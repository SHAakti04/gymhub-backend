import { AppError } from "../../common/errors/app-error.js";
import { payrollRepository, type PayrollInput } from "./payroll.repository.js";

export const payrollService = {
  list(gymId: string) {
    return payrollRepository.list(gymId);
  },

  async create(gymId: string, input: PayrollInput) {
    const staff = await payrollRepository.findStaff(input.staffId, gymId);
    if (!staff) {
      throw new AppError(404, "STAFF_NOT_FOUND", "Staff member not found");
    }

    return payrollRepository.create(gymId, input);
  },
};