import { cashflowRepository, type CashflowInput } from "./cashflow.repository.js";

export const cashflowService = {
  list(gymId: string) {
    return cashflowRepository.list(gymId);
  },

  create(gymId: string, input: CashflowInput) {
    return cashflowRepository.create(gymId, input);
  },
};