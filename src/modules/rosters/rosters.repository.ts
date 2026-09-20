import { randomUUID } from "node:crypto";
import { query, execute } from "../../config/db.js";

export interface RosterInput {
  staffId: string;
  rosterDate: string;
  shiftStart: string;
  shiftEnd: string;
  notes?: string | null;
}

export const rostersRepository = {
  async list(gymId: string) {
    return query(
      `SELECT r.id, r.staff_id, s.name AS staff_name, s.role_name,
              TO_CHAR(r.roster_date, 'YYYY-MM-DD') AS roster_date,
              TO_CHAR(r.shift_start, 'HH24:MI') AS shift_start,
              TO_CHAR(r.shift_end, 'HH24:MI') AS shift_end,
              r.notes, r.created_at
       FROM staff_rosters r
       JOIN staff s ON s.id = r.staff_id
       WHERE r.gym_id = $1
       ORDER BY r.roster_date DESC, r.shift_start ASC`,
      [gymId],
    );
  },

  async findStaff(staffId: string, gymId: string) {
    const rows = await query(
      `SELECT id FROM staff WHERE id = $1 AND gym_id = $2 LIMIT 1`,
      [staffId, gymId],
    );
    return rows[0] ?? null;
  },

  async findById(id: string, gymId: string) {
    const rows = await query(
      `SELECT r.id, r.staff_id, s.name AS staff_name, s.role_name,
              TO_CHAR(r.roster_date, 'YYYY-MM-DD') AS roster_date,
              TO_CHAR(r.shift_start, 'HH24:MI') AS shift_start,
              TO_CHAR(r.shift_end, 'HH24:MI') AS shift_end,
              r.notes, r.created_at
       FROM staff_rosters r
       JOIN staff s ON s.id = r.staff_id
       WHERE r.id = $1 AND r.gym_id = $2
       LIMIT 1`,
      [id, gymId],
    );
    return rows[0] ?? null;
  },

  async create(gymId: string, input: RosterInput) {
    const id = randomUUID();

    await query(
      `INSERT INTO staff_rosters (id, staff_id, gym_id, roster_date, shift_start, shift_end, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.staffId, gymId, input.rosterDate, input.shiftStart, input.shiftEnd, input.notes ?? null],
    );

    return this.findById(id, gymId);
  },

  async delete(id: string, gymId: string) {
    const result = await execute(
      `DELETE FROM staff_rosters WHERE id = $1 AND gym_id = $2`,
      [id, gymId],
    );
    return (result.rowCount ?? 0) > 0;
  },
};