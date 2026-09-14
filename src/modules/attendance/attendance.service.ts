import { AppError } from "../../common/errors/app-error.js";
import { makeDailyQrCode } from "../../common/utils/qr.util.js";
import { attendanceRepository } from "./attendance.repository.js";

export const attendanceService = {
  async getToday(gymId: string) {
    return attendanceRepository.getTodayAttendance(gymId);
  },

  async getDailyQr(gymId: string) {
    return attendanceRepository.getDailyQr(gymId);
  },

  async generateDailyQr(gymId: string, generatedByUserId: string | null) {
    const code = makeDailyQrCode(gymId);
    return attendanceRepository.upsertDailyQr({ gymId, code, generatedByUserId });
  },

  async validateDailyQr(gymId: string, code: string) {
    const current = await attendanceRepository.getDailyQr(gymId);
    return { valid: Boolean(current && current.code === code), current };
  },

  async checkIn(input: { memberId: string; gymId: string; qrCode: string; source: "camera" }) {
    const member = await attendanceRepository.findActiveMember(input.memberId, input.gymId);
    if (!member) {
      throw new AppError(403, "ACTIVE_MEMBER_REQUIRED", "Only active joined members can scan attendance QR");
    }

    const validation = await this.validateDailyQr(input.gymId, input.qrCode);
    if (!validation.valid) {
      throw new AppError(400, "INVALID_QR", "Daily QR code is invalid");
    }

    const existing = await attendanceRepository.getOpenSession(input.memberId);
    if (existing) {
      throw new AppError(409, "DUPLICATE_CHECKIN", "Member already checked in today");
    }

    return attendanceRepository.createCheckIn(input);
  },

  async checkOut(memberId: string) {
    const existing = await attendanceRepository.getOpenSession(memberId);
    if (!existing) {
      throw new AppError(404, "SESSION_NOT_FOUND", "No open attendance session found");
    }
    return attendanceRepository.completeCheckOut(memberId);
  },

  async absentToday(gymId: string) {
    return attendanceRepository.getAbsentToday(gymId);
  },

  async queueAbsenceReminders(gymId: string) {
    return attendanceRepository.queueAbsenceReminders(gymId);
  },

  async listAbsenceReminders(gymId: string) {
    return attendanceRepository.listAbsenceReminders(gymId);
  },

  async queueAbsenceRemindersForAllGyms() {
    const gyms = await attendanceRepository.listActiveGyms();
    let queued = 0;

    for (const gym of gyms) {
      const result = await attendanceRepository.queueAbsenceReminders(gym.id);
      queued += result.queued;
    }

    return { gyms: gyms.length, queued };
  },
};