import { AppError } from "../../common/errors/app-error.js";
import {
  competitionsRepository,
  type CompetitionRow,
  type ParticipantRow,
} from "./competitions.repository.js";

function mapParticipant(row: ParticipantRow) {
  return {
    memberId: row.member_id,
    memberName: row.member_name,
    score: Number(row.score),
    joinedAt: row.joined_at,
  };
}

function mapCompetition(row: CompetitionRow, participants: ParticipantRow[]) {
  const mine = participants
    .filter((p) => p.competition_id === row.id)
    .map(mapParticipant)
    .sort((a, b) => b.score - a.score);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    prize: row.prize,
    active: Boolean(row.active),
    createdAt: row.created_at,
    participants: mine,
  };
}

export const competitionsService = {
  async list(gymId: string) {
    const rows = await competitionsRepository.listForGym(gymId);
    const participants = await competitionsRepository.listParticipants(rows.map((r) => r.id));
    return (rows as CompetitionRow[]).map((row) => mapCompetition(row, participants as ParticipantRow[]));
  },

  async listActive(gymId: string) {
    const rows = await competitionsRepository.listActiveForGym(gymId);
    const participants = await competitionsRepository.listParticipants(rows.map((r) => r.id));
    return (rows as CompetitionRow[]).map((row) => mapCompetition(row, participants as ParticipantRow[]));
  },

  async getLeaderboard(id: string, gymId: string) {
    const competition = await competitionsRepository.getById(id, gymId);
    if (!competition) {
      throw new AppError(404, "NOT_FOUND", "Competition not found");
    }
    const participants = await competitionsRepository.listParticipants([id]);
    return (participants as ParticipantRow[]).map(mapParticipant).sort((a, b) => b.score - a.score);
  },

  async create(
    gymId: string,
    input: { name: string; description?: string; startDate: string; endDate: string; prize?: string },
  ) {
    if (!input.name.trim()) {
      throw new AppError(400, "VALIDATION_ERROR", "Name is required");
    }
    const row = await competitionsRepository.create({ gymId, ...input });
    return mapCompetition(row as CompetitionRow, []);
  },

  async update(
    id: string,
    gymId: string,
    patch: Partial<{
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      prize: string;
      active: boolean;
    }>,
  ) {
    const row = await competitionsRepository.update(id, gymId, patch);
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Competition not found");
    }
    const participants = await competitionsRepository.listParticipants([id]);
    return mapCompetition(row as CompetitionRow, participants as ParticipantRow[]);
  },

  async remove(id: string, gymId: string) {
    const existing = await competitionsRepository.getById(id, gymId);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Competition not found");
    }
    await competitionsRepository.remove(id, gymId);
    return { deleted: true };
  },

  async join(id: string, gymId: string, memberId: string) {
    const competition = await competitionsRepository.getById(id, gymId);
    if (!competition) {
      throw new AppError(404, "NOT_FOUND", "Competition not found");
    }
    if (!competition.active) {
      throw new AppError(400, "COMPETITION_INACTIVE", "This competition is no longer active");
    }
    await competitionsRepository.join(id, memberId);
    return { joined: true };
  },

  async updateScore(id: string, gymId: string, memberId: string, score: number) {
    const competition = await competitionsRepository.getById(id, gymId);
    if (!competition) {
      throw new AppError(404, "NOT_FOUND", "Competition not found");
    }
    const updated = await competitionsRepository.updateScore(id, memberId, score);
    if (!updated) {
      throw new AppError(404, "NOT_FOUND", "Participant not found in this competition");
    }
    return { updated: true };
  },
};