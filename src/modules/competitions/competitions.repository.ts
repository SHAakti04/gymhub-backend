import { query, execute } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export interface CompetitionRow {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize: string | null;
  active: boolean;
  created_at: string;
}

export interface ParticipantRow {
  competition_id: string;
  member_id: string;
  member_name: string;
  score: string;
  joined_at: string;
}

export const competitionsRepository = {
  async listForGym(gymId: string) {
    return query(
      `SELECT * FROM competitions WHERE gym_id = $1 ORDER BY created_at DESC`,
      [gymId],
    );
  },

  async listActiveForGym(gymId: string) {
    return query(
      `SELECT * FROM competitions WHERE gym_id = $1 AND active = TRUE AND end_date >= CURRENT_DATE ORDER BY start_date ASC`,
      [gymId],
    );
  },

  async getById(id: string, gymId: string) {
    const rows = await query(
      `SELECT * FROM competitions WHERE id = $1 AND gym_id = $2 LIMIT 1`,
      [id, gymId],
    );
    return rows[0] ?? null;
  },

  async listParticipants(competitionIds: string[]) {
    if (competitionIds.length === 0) return [];
    return query(
      `
      SELECT
        cp.competition_id,
        cp.member_id,
        u.full_name AS member_name,
        cp.score,
        cp.joined_at
      FROM competition_participants cp
      JOIN members m ON m.id = cp.member_id
      JOIN users u ON u.id = m.user_id
      WHERE cp.competition_id = ANY($1)
      ORDER BY cp.score DESC
      `,
      [competitionIds],
    );
  },

  async create(input: {
    gymId: string;
    name: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    prize?: string | null;
  }) {
    const id = makeId();
    await query(
      `INSERT INTO competitions (id, gym_id, name, description, start_date, end_date, prize, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())`,
      [id, input.gymId, input.name, input.description ?? null, input.startDate, input.endDate, input.prize ?? null],
    );
    return this.getById(id, input.gymId);
  },

  async update(
    id: string,
    gymId: string,
    patch: {
      name?: string;
      description?: string | null;
      startDate?: string;
      endDate?: string;
      prize?: string | null;
      active?: boolean;
    },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.name !== undefined) { fields.push("name"); values.push(patch.name); }
    if (patch.description !== undefined) { fields.push("description"); values.push(patch.description); }
    if (patch.startDate !== undefined) { fields.push("start_date"); values.push(patch.startDate); }
    if (patch.endDate !== undefined) { fields.push("end_date"); values.push(patch.endDate); }
    if (patch.prize !== undefined) { fields.push("prize"); values.push(patch.prize); }
    if (patch.active !== undefined) { fields.push("active"); values.push(patch.active); }

    if (fields.length === 0) return this.getById(id, gymId);

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    await query(
      `UPDATE competitions SET ${setClauses} WHERE id = $${fields.length + 1} AND gym_id = $${fields.length + 2}`,
      [...values, id, gymId],
    );
    return this.getById(id, gymId);
  },

  async remove(id: string, gymId: string) {
    await query(`DELETE FROM competitions WHERE id = $1 AND gym_id = $2`, [id, gymId]);
  },

  async join(competitionId: string, memberId: string) {
    const existing = await query(
      `SELECT id FROM competition_participants WHERE competition_id = $1 AND member_id = $2 LIMIT 1`,
      [competitionId, memberId],
    );
    if (existing[0]) return (existing[0] as Record<string, unknown>).id as string;

    const id = makeId();
    try {
      await query(
        `INSERT INTO competition_participants (id, competition_id, member_id, score, joined_at, created_at)
         VALUES ($1, $2, $3, 0, NOW(), NOW())`,
        [id, competitionId, memberId],
      );
    } catch (error: unknown) {
      if ((error as Record<string, unknown>)?.code === "23505") {
        const dupe = await query(
          `SELECT id FROM competition_participants WHERE competition_id = $1 AND member_id = $2 LIMIT 1`,
          [competitionId, memberId],
        );
        return (dupe[0] as Record<string, unknown>)?.id as string;
      }
      throw error;
    }
    return id;
  },

  async updateScore(competitionId: string, memberId: string, score: number) {
    const result = await execute(
      `UPDATE competition_participants SET score = $1 WHERE competition_id = $2 AND member_id = $3`,
      [score, competitionId, memberId],
    );
    return (result.rowCount ?? 0) > 0;
  },
};