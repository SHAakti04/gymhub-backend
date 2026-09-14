import { AppError } from "../../common/errors/app-error.js";
import { rostersRepository, type RosterInput } from "./rosters.repository.js";

export const rostersService = {
  list(gymId: string) {
    return rostersRepository.list(gymId);
  },

  async create(gymId: string, input: RosterInput) {
    const staff = await rostersRepository.findStaff(input.staffId, gymId);
    if (!staff) {
      throw new AppError(404, "STAFF_NOT_FOUND", "Staff member not found");
    }

    return rostersRepository.create(gymId, input);
  },

  async delete(id: string, gymId: string) {
    const deleted = await rostersRepository.delete(id, gymId);
    if (!deleted) {
      throw new AppError(404, "ROSTER_NOT_FOUND", "Roster entry not found");
    }
    return { deleted: true };
  },
};