import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { query } from "../../config/db.js";

export interface RosterInput {
  staffId: string;
  rosterDate: string;
  shiftStart: string;
  shiftEnd: string;
  notes?: string | null;
}

export const rostersRepository = {
  async list(gymId: string) {
    return query<RowDataPacket[]>(
      `SELECT r.id, r.staff_id, s.name AS staff_name, s.role_name,
              DATE_FORMAT(r.roster_date, '%Y-%m-%d') AS roster_date,
              TIME_FORMAT(r.shift_start, '%H:%i') AS shift_start,
              TIME_FORMAT(r.shift_end, '%H:%i') AS shift_end,
              r.notes, r.created_at
       FROM staff_rosters r
       JOIN staff s ON s.id = r.staff_id
       WHERE r.gym_id = ?
       ORDER BY r.roster_date DESC, r.shift_start ASC`,
      [gymId],
    );
  },

  async findStaff(staffId: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `SELECT id FROM staff WHERE id = ? AND gym_id = ? LIMIT 1`,
      [staffId, gymId],
    );
    return rows[0] ?? null;
  },

  async findById(id: string, gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `SELECT r.id, r.staff_id, s.name AS staff_name, s.role_name,
              DATE_FORMAT(r.roster_date, '%Y-%m-%d') AS roster_date,
              TIME_FORMAT(r.shift_start, '%H:%i') AS shift_start,
              TIME_FORMAT(r.shift_end, '%H:%i') AS shift_end,
              r.notes, r.created_at
       FROM staff_rosters r
       JOIN staff s ON s.id = r.staff_id
       WHERE r.id = ? AND r.gym_id = ?
       LIMIT 1`,
      [id, gymId],
    );
    return rows[0] ?? null;
  },

  async create(gymId: string, input: RosterInput) {
    const id = randomUUID();

    await query<ResultSetHeader>(
      `INSERT INTO staff_rosters (id, staff_id, gym_id, roster_date, shift_start, shift_end, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.staffId, gymId, input.rosterDate, input.shiftStart, input.shiftEnd, input.notes ?? null],
    );

    return this.findById(id, gymId);
  },

  async delete(id: string, gymId: string) {
    const result = await query<ResultSetHeader>(
      `DELETE FROM staff_rosters WHERE id = ? AND gym_id = ?`,
      [id, gymId],
    );
    return result.affectedRows > 0;
  },
};