import { paymentSettingsRepository } from "./payment-settings.repository.js";

export const paymentSettingsService = {
  async getPublic(gymId: string) {
    return paymentSettingsRepository.getPublic(gymId);
  },

  async getAdmin(gymId: string) {
    return paymentSettingsRepository.getAdmin(gymId);
  },

  async save(input: {
    gymId: string;
    upiId?: string;
    payeeName?: string;
    qrImageUrl?: string;
    instructions?: string;
    isActive?: boolean;
  }) {
    return paymentSettingsRepository.upsert({
      gymId: input.gymId,
      upiId: input.upiId?.trim() || null,
      payeeName: input.payeeName?.trim() || null,
      qrImageUrl: input.qrImageUrl?.trim() || null,
      instructions: input.instructions?.trim() || null,
      isActive: input.isActive ?? true
    });
  }
};